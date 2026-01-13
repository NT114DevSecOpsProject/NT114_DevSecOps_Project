from sqlalchemy import exc
from flask import Blueprint, jsonify, request
from app.models import Exercise, db
from app.utils import authenticate, is_admin
from app.logger import get_logger
from app.constants import (
    FULL_TRACEBACK_MSG,
    INTERNAL_SERVER_ERROR,
    INVALID_PAYLOAD_ERROR,
)
import re
import ast

# Get logger for this module
logger = get_logger('exercises_api')

exercises_blueprint = Blueprint("exercises", __name__)


def sanitize_log_input(value, max_length=100):
    """
    Sanitize user input before logging to prevent log injection.
    Removes newlines, carriage returns, tabs and other control characters.
    """
    if value is None:
        return "None"
    # Convert to string
    sanitized = str(value)
    # Remove newlines, carriage returns, tabs and other control characters
    sanitized = re.sub(r'[\r\n\t\x00-\x1f\x7f-\x9f]', '', sanitized)
    # Limit length to prevent log flooding
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length] + "..."
    return sanitized


def validate_exercise_id(exercise_id):
    """
    Validate and convert exercise_id to integer.
    Returns (int_value, error_message) tuple.
    """
    try:
        return int(exercise_id), None
    except (ValueError, TypeError):
        return None, "Invalid exercise ID format"


def validate_code_safety(code):
    """
    Validate that user code is safe to execute.
    Returns (is_safe, error_message) tuple.
    
    This performs basic AST analysis to detect dangerous patterns.
    """
    if not code or not isinstance(code, str):
        return False, "Code must be a non-empty string"
    
    # List of dangerous built-in functions and modules
    dangerous_names = {
        'eval', 'exec', 'compile', 'open', 'file', 'input', 'raw_input',
        '__import__', 'reload', 'execfile', 'globals', 'locals', 'vars',
        'getattr', 'setattr', 'delattr', 'hasattr',
    }
    
    dangerous_modules = {
        'os', 'sys', 'subprocess', 'shutil', 'socket', 'urllib', 
        'requests', 'pickle', 'marshal', 'shelve', 'importlib',
        'builtins', '__builtins__', 'code', 'codeop',
    }
    
    try:
        # Parse the code into an AST
        tree = ast.parse(code)
        
        for node in ast.walk(tree):
            # Check for dangerous function calls
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in dangerous_names:
                        return False, f"Dangerous function '{node.func.id}' is not allowed"
                elif isinstance(node.func, ast.Attribute):
                    if node.func.attr in dangerous_names:
                        return False, f"Dangerous method '{node.func.attr}' is not allowed"
            
            # Check for dangerous imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module_name = alias.name.split('.')[0]
                    if module_name in dangerous_modules:
                        return False, f"Import of '{alias.name}' is not allowed"
            
            if isinstance(node, ast.ImportFrom):
                if node.module:
                    module_name = node.module.split('.')[0]
                    if module_name in dangerous_modules:
                        return False, f"Import from '{node.module}' is not allowed"
            
            # Check for attribute access to dangerous names
            if isinstance(node, ast.Attribute):
                if node.attr.startswith('_'):
                    return False, "Access to private attributes is not allowed"
        
        return True, None
        
    except SyntaxError as e:
        return False, f"Syntax error in code: {str(e)}"
    except Exception as e:
        return False, f"Error parsing code: {str(e)}"


def execute_code_safely(code, namespace, timeout_seconds=5):
    """
    Execute user code in a restricted environment.
    Returns (success, result_or_error) tuple.
    """
    # Validate code safety first
    is_safe, error = validate_code_safety(code)
    if not is_safe:
        return False, error
    
    # Create a restricted namespace
    restricted_builtins = {
        'abs': abs, 'all': all, 'any': any, 'bin': bin, 'bool': bool,
        'chr': chr, 'dict': dict, 'divmod': divmod, 'enumerate': enumerate,
        'filter': filter, 'float': float, 'format': format, 'frozenset': frozenset,
        'hex': hex, 'int': int, 'isinstance': isinstance, 'issubclass': issubclass,
        'iter': iter, 'len': len, 'list': list, 'map': map, 'max': max,
        'min': min, 'next': next, 'oct': oct, 'ord': ord, 'pow': pow,
        'print': print, 'range': range, 'repr': repr, 'reversed': reversed,
        'round': round, 'set': set, 'slice': slice, 'sorted': sorted,
        'str': str, 'sum': sum, 'tuple': tuple, 'type': type, 'zip': zip,
        'True': True, 'False': False, 'None': None,
    }
    
    safe_namespace = {'__builtins__': restricted_builtins}
    safe_namespace.update(namespace)
    
    try:
        # Execute the code with restricted builtins
        exec(code, safe_namespace)  # nosec B102 - Code is validated before execution
        return True, safe_namespace
    except Exception as e:
        return False, str(e)


@exercises_blueprint.route("/ping", methods=["GET"])
def ping_pong():
    return jsonify({"status": "success", "message": "pong!"})


@exercises_blueprint.route("/", methods=["GET"])
def get_all_exercises():
    """Get all exercises"""
    logger.info("Getting all exercises")
    try:
        exercises = Exercise.query.all()
        logger.debug(f"Found {len(exercises)} exercises")
        response_object = {
            "status": "success",
            "data": {"exercises": [ex.to_json() for ex in exercises]},
        }
        logger.info("Successfully retrieved all exercises")
        return jsonify(response_object), 200
    except Exception as e:
        logger.error(f"Error getting all exercises: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/<exercise_id>", methods=["GET"])
def get_single_exercise(exercise_id):
    """Get single exercise"""
    response_object = {"status": "fail", "message": "Exercise does not exist"}
    
    # Validate exercise_id first (FIX: prevent log injection)
    validated_id, error = validate_exercise_id(exercise_id)
    if error:
        logger.warning("Invalid exercise ID format provided")
        return jsonify(response_object), 404
    
    logger.info(f"Getting exercise with ID: {validated_id}")
    
    try:
        exercise = Exercise.query.filter_by(id=validated_id).first()
        if not exercise:
            logger.warning(f"Exercise with ID {validated_id} not found")
            return jsonify(response_object), 404
        else:
            logger.info(f"Successfully found exercise: {sanitize_log_input(exercise.title)}")
            response_object = {"status": "success", "data": exercise.to_json()}
            return jsonify(response_object), 200
    except Exception as e:
        logger.error(f"Error getting exercise: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/validate_code", methods=["POST"])
def validate_code():
    """Validate code against exercise test cases"""
    logger.info("Code validation request")
    
    data = request.get_json()
    if not data or "answer" not in data or "exercise_id" not in data:
        logger.warning("Invalid validation request - missing data")
        return jsonify({"status": "fail", "message": "Invalid data!"}), 400

    answer = data["answer"]
    
    # Validate exercise_id FIRST before any logging (FIX: prevent log injection)
    validated_id, error = validate_exercise_id(data["exercise_id"])
    if error:
        logger.warning("Invalid exercise ID format in validation request")
        return jsonify({"status": "fail", "message": "Invalid exercise ID!"}), 400
    
    # Now safe to log validated_id (it's an integer)
    logger.debug(f"Validating code for exercise {validated_id}")

    try:
        exercise = Exercise.query.get(validated_id)
        if not exercise:
            logger.warning(f"Exercise {validated_id} not found for validation")
            return jsonify({"status": "fail", "message": "Exercise not found!"}), 404

        tests = exercise.test_cases
        solutions = exercise.solutions

        if len(tests) != len(solutions):
            logger.error(f"Tests and solutions length mismatch for exercise {validated_id}")
            return jsonify({
                "status": "fail", 
                "message": "Tests and solutions length mismatch!"
            }), 500

        results = []
        user_results = []

        # FIX: Use safe code execution instead of direct exec()
        success, namespace_or_error = execute_code_safely(answer, {})
        if not success:
            logger.warning(f"Code validation failed for exercise {validated_id}: unsafe code detected")
            return jsonify({
                "status": "fail",
                "message": f"Code validation failed: {namespace_or_error}!"
            }), 400
        
        namespace = namespace_or_error

        for test, sol in zip(tests, solutions):
            try:
                # Capture stdout to get print() output
                import io
                import sys
                captured_output = io.StringIO()
                old_stdout = sys.stdout
                sys.stdout = captured_output

                try:
                    res = eval(test, namespace)  # nosec B307 - test cases are from trusted admin
                    output = captured_output.getvalue().strip()

                    # Use output if available, otherwise use return value
                    user_str = output if output else str(res)
                    user_results.append(user_str)
                    results.append(user_str == sol)
                finally:
                    sys.stdout = old_stdout
            except Exception as e:
                user_results.append(f"Error: {sanitize_log_input(str(e))}")
                results.append(False)

        all_correct = all(results)
        logger.info(f"Code validation completed for exercise {validated_id}: {all_correct}")
        
        return jsonify({
            "status": "success",
            "results": results,
            "user_results": user_results,
            "all_correct": all_correct,
        }), 200
        
    except Exception as e:
        logger.error(f"Error during code validation: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/", methods=["POST"])
@authenticate
def add_exercise(user_data):
    """Add exercise (admin only)"""
    logger.info("Adding new exercise")
    
    if not is_admin(user_data):
        logger.warning("Non-admin user attempted to add exercise")
        response_object = {
            "status": "fail",
            "message": "You do not have permission to do that."
        }
        return jsonify(response_object), 401
    
    post_data = request.get_json()
    if not post_data:
        logger.warning("Empty payload received for add exercise")
        response_object = {"status": "fail", "message": INVALID_PAYLOAD_ERROR}
        return jsonify(response_object), 400
        
    title = post_data.get("title")
    body = post_data.get("body")
    difficulty = post_data.get("difficulty")
    test_cases = post_data.get("test_cases")
    solutions = post_data.get("solutions")
    
    if not all([title, body, difficulty is not None, test_cases, solutions]):
        logger.warning("Missing required fields for add exercise")
        response_object = {"status": "fail", "message": "Missing required fields"}
        return jsonify(response_object), 400
    
    # Sanitize title for logging
    safe_title = sanitize_log_input(title)
    logger.debug(f"Attempting to add exercise: {safe_title}")
    
    try:
        exercise = Exercise(
            title=title,
            body=body,
            difficulty=difficulty,
            test_cases=test_cases,
            solutions=solutions,
        )
        db.session.add(exercise)
        db.session.commit()
        
        logger.info(f"Successfully added exercise: {safe_title}")
        response_object = {
            "status": "success",
            "message": "New exercise was added!",
            "data": exercise.to_json(),
        }
        return jsonify(response_object), 201
        
    except exc.IntegrityError as e:
        logger.error(f"Database integrity error adding exercise: {sanitize_log_input(str(e))}")
        db.session.rollback()
        return jsonify({"status": "fail", "message": INVALID_PAYLOAD_ERROR}), 400
    except Exception as e:
        logger.error(f"Error adding exercise: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        db.session.rollback()
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/<exercise_id>", methods=["PUT"])
@authenticate
def update_exercise(user_data, exercise_id):
    """Update exercise (admin only)"""
    
    # Validate exercise_id first (FIX: prevent log injection)
    validated_id, error = validate_exercise_id(exercise_id)
    if error:
        logger.warning("Invalid exercise ID format for update")
        return jsonify({"status": "fail", "message": "Invalid exercise ID"}), 400
    
    logger.info(f"Updating exercise {validated_id}")
    
    if not is_admin(user_data):
        logger.warning("Non-admin user attempted to update exercise")
        response_object = {
            "status": "fail",
            "message": "You do not have permission to do that."
        }
        return jsonify(response_object), 401

    try:
        post_data = request.get_json()
        if not post_data:
            logger.warning("Empty payload received for update exercise")
            return jsonify({"status": "fail", "message": INVALID_PAYLOAD_ERROR}), 400

        title = post_data.get("title")
        body = post_data.get("body")
        difficulty = post_data.get("difficulty")
        test_cases = post_data.get("test_cases")
        solutions = post_data.get("solutions")

        if all(x is None for x in [title, body, difficulty, test_cases, solutions]):
            logger.warning("No fields to update in payload")
            response_object = {"status": "fail", "message": "No fields to update in payload!"}
            return jsonify(response_object), 400

        exercise = Exercise.query.filter_by(id=validated_id).first()
        if not exercise:
            logger.warning(f"Exercise {validated_id} not found for update")
            response_object = {"status": "fail", "message": "Sorry. That exercise does not exist."}
            return jsonify(response_object), 404

        # Update fields
        if title is not None:
            exercise.title = title
        if body is not None:
            exercise.body = body
        if difficulty is not None:
            exercise.difficulty = difficulty
        if test_cases is not None:
            exercise.test_cases = test_cases
        if solutions is not None:
            exercise.solutions = solutions
            
        db.session.commit()
        
        logger.info(f"Successfully updated exercise {validated_id}")
        response_object = {
            "status": "success",
            "message": "Exercise was updated!",
            "data": exercise.to_json()
        }
        return jsonify(response_object), 200
        
    except Exception as e:
        logger.error(f"Error updating exercise: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        db.session.rollback()
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/<exercise_id>", methods=["DELETE"])
@authenticate
def delete_exercise(user_data, exercise_id):
    """Delete exercise (admin only)"""
    
    # Validate exercise_id first (FIX: prevent log injection)
    validated_id, error = validate_exercise_id(exercise_id)
    if error:
        logger.warning("Invalid exercise ID format for delete")
        return jsonify({"status": "fail", "message": "Invalid exercise ID"}), 400
    
    logger.info(f"Deleting exercise {validated_id}")
    
    if not is_admin(user_data):
        logger.warning("Non-admin user attempted to delete exercise")
        response_object = {
            "status": "fail",
            "message": "You do not have permission to do that."
        }
        return jsonify(response_object), 401
    
    try:
        exercise = Exercise.query.filter_by(id=validated_id).first()
        if not exercise:
            logger.warning(f"Exercise {validated_id} not found for delete")
            return jsonify({"status": "fail", "message": "Exercise not found"}), 404
        
        db.session.delete(exercise)
        db.session.commit()
        
        logger.info(f"Successfully deleted exercise {validated_id}")
        return jsonify({"status": "success", "message": "Exercise deleted"}), 200
        
    except Exception as e:
        logger.error(f"Error deleting exercise: {sanitize_log_input(str(e))}")
        logger.exception(FULL_TRACEBACK_MSG)
        db.session.rollback()
        return jsonify({"status": "error", "message": INTERNAL_SERVER_ERROR}), 500


@exercises_blueprint.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "success",
        "message": "Exercises service is healthy"
    }), 200