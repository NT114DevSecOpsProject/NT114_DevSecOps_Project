from functools import wraps
from flask import request, jsonify
from app.models import User
from app.logger import get_logger

# Get logger for this module
logger = get_logger("auth_utils")


def authenticate(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.debug(f"Authentication check for endpoint: {f.__name__}")

        response_object = {
            "status": "fail",
            "message": "Something went wrong. Please contact us.",
        }
        code = 401

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"Missing Authorization header for {f.__name__}")
            response_object["message"] = "Provide a valid auth token."
            code = 403
            return jsonify(response_object), code

        try:
            auth_token = auth_header.split(" ")[1]
            logger.debug("Validating auth token")
        except IndexError:
            logger.warning("Invalid Authorization header format")
            response_object["message"] = "Invalid token format."
            return jsonify(response_object), code

        user_id = decode_auth_token(str(auth_token))
        if not user_id:
            logger.warning("Invalid or expired auth token")
            response_object["message"] = "Invalid token. Please log in again."
            return jsonify(response_object), code

        logger.debug(f"Authentication successful for user_id: {user_id}")
        return f(user_id, *args, **kwargs)

    return decorated_function


def decode_auth_token(auth_token):
    """
    Decodes the auth token and returns user_id if valid
    """
    try:
        user_id = User.decode_auth_token(auth_token)

        if isinstance(user_id, str):
            # Token decode returned an error message
            logger.warning(f"Token decode error: {user_id}")
            return None

        # Check if user exists and is active
        user = User.query.filter_by(id=user_id).first()
        if not user:
            logger.warning(f"Token valid but user not found: {user_id}")
            return None

        if not user.active:
            logger.warning(
                f"Token valid but user inactive: {user.username} ({user.email})"
            )
            return None

        logger.debug(f"Token successfully decoded for user: {user.username}")
        return user_id

    except Exception as e:
        logger.error(f"Error decoding auth token: {str(e)}")
        logger.exception("Full traceback:")
        return None


def is_admin(user_id):
    """
    Check if user has admin privileges
    """
    logger.debug(f"Checking admin status for user_id: {user_id}")

    try:
        user = User.query.filter_by(id=user_id).first()
        if not user:
            logger.warning(f"Admin check for non-existent user_id: {user_id}")
            return False

        is_admin_user = user.admin
        logger.debug(f"User {user.username} admin status: {is_admin_user}")
        return is_admin_user

    except Exception as e:
        logger.error(f"Error checking admin status for user_id {user_id}: {str(e)}")
        logger.exception("Full traceback:")
        return False

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"Missing Authorization header for {f.__name__}")
            response_object["message"] = "Provide a valid auth token."
            code = 403
            return jsonify(response_object), code

        try:
            auth_token = auth_header.split(" ")[1]
            logger.debug(f"Extracted auth token for {f.__name__}")
        except IndexError:
            logger.warning(f"Invalid Authorization header format for {f.__name__}")
            response_object["message"] = "Bearer token malformed."
            code = 403
            return jsonify(response_object), code

        resp = User.decode_auth_token(auth_token)
        logger.debug(f"Token decode result for {f.__name__}: {resp} (type: {type(resp)})")

        if isinstance(resp, str):
            logger.warning(f"Token decode failed for {f.__name__}: {resp}")
            response_object["message"] = resp
            return jsonify(response_object), code

        user = User.query.filter_by(id=resp).first()
        if not user:
            logger.error(f"User not found for decoded token user_id {resp} in {f.__name__}")
            response_object["message"] = "Invalid token."
            return jsonify(response_object), code

        if not user.active:
            logger.warning(f"Inactive user {user.username} attempted to access {f.__name__}")
            response_object["message"] = "User account is inactive."
            return jsonify(response_object), code

        logger.debug(f"Authentication successful for user {user.username} in {f.__name__}")
        return f(resp, *args, **kwargs)

    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.debug(f"Admin check for endpoint: {f.__name__}")

        response_object = {
            "status": "fail",
            "message": "Something went wrong. Please contact us.",
        }
        code = 401

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"Missing Authorization header for admin endpoint {f.__name__}")
            response_object["message"] = "Provide a valid auth token."
            code = 403
            return jsonify(response_object), code

        try:
            auth_token = auth_header.split(" ")[1]
            logger.debug(f"Extracted auth token for admin endpoint {f.__name__}")
        except IndexError:
            logger.warning(f"Invalid Authorization header format for admin endpoint {f.__name__}")
            response_object["message"] = "Bearer token malformed."
            code = 403
            return jsonify(response_object), code

        resp = User.decode_auth_token(auth_token)
        logger.debug(f"Token decode result for admin endpoint {f.__name__}: {resp} (type: {type(resp)})")

        if isinstance(resp, str):
            logger.warning(f"Token decode failed for admin endpoint {f.__name__}: {resp}")
            response_object["message"] = resp
            return jsonify(response_object), code

        user = User.query.filter_by(id=resp).first()
        if not user:
            logger.error(f"User not found for decoded token user_id {resp} in admin endpoint {f.__name__}")
            response_object["message"] = "Invalid token."
            return jsonify(response_object), code

        if not user.active:
            logger.warning(f"Inactive user {user.username} attempted to access admin endpoint {f.__name__}")
            response_object["message"] = "User account is inactive."
            return jsonify(response_object), code

        if not user.admin:
            logger.warning(f"Non-admin user {user.username} attempted to access admin endpoint {f.__name__}")
            response_object["message"] = "Admin privileges required."
            code = 403
            return jsonify(response_object), code

        logger.debug(f"Admin authentication successful for user {user.username} in {f.__name__}")
        return f(resp, *args, **kwargs)

    return decorated_function