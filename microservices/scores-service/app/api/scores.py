from sqlalchemy import exc
from flask import Blueprint, jsonify, request
from app.models import Score, db
from app.utils import authenticate
from app.logger import get_logger

# Get logger for this module
logger = get_logger('scores_api')

scores_blueprint = Blueprint("scores", __name__)

@scores_blueprint.route("/ping", methods=["GET"])
def ping_pong():
    return jsonify({"status": "success", "message": "pong!"})

@scores_blueprint.route("/", methods=["GET"])
def get_all_scores():
    """Get all scores (matching monolithic pattern)"""
    logger.info("Getting all scores")
    response_object = {
        "status": "success",
        "data": {"scores": [ex.to_json() for ex in Score.query.all()]},
    }
    logger.info("Successfully retrieved all scores")
    return jsonify(response_object), 200

@scores_blueprint.route("/user", methods=["GET"])
@authenticate
def get_all_scores_by_user_user(user_data):
    """Get all scores by user id (matching monolithic pattern)"""
    user_id = user_data.get('id')
    logger.info(f"Getting all scores for user {user_id}")
    
    scores = Score.query.filter_by(user_id=user_id).all()
    response_object = {
        "status": "success",
        "data": {"scores": [ex.to_json() for ex in scores]},
    }
    logger.info(f"Successfully retrieved scores for user {user_id}")
    return jsonify(response_object), 200

@scores_blueprint.route("/user/<score_id>", methods=["GET"])
@authenticate
def get_single_score_by_user_id(user_data, score_id):
    """Get single score by user id (matching monolithic function name)"""
    user_id = user_data.get('id')
    logger.info(f"Getting score {score_id} for user {user_id}")
    
    response_object = {"status": "fail", "message": "Score does not exist"}
    try:
        score = Score.query.filter_by(id=int(score_id), user_id=user_id).first()
        if not score:
            logger.warning(f"Score {score_id} not found for user {user_id}")
            return jsonify(response_object), 404
        else:
            logger.info(f"Successfully found score {score_id} for user {user_id}")
            response_object = {"status": "success", "data": score.to_json()}
            return jsonify(response_object), 200
    except ValueError as e:
        logger.error(f"Invalid score ID format: {score_id} - {str(e)}")
        return jsonify(response_object), 404

@scores_blueprint.route("/", methods=["POST"])
@authenticate
def add_scores(user_data):
    """Create a new score (matching monolithic function name)"""
    user_id = user_data.get('id')
    logger.info(f"Creating new score for user {user_id}")
    
    post_data = request.get_json()
    response_object = {"status": "fail", "message": "Invalid payload."}
    
    if not post_data:
        logger.warning("Empty payload received")
        return jsonify(response_object), 400
    
    exercise_id = post_data.get("exercise_id")
    answer = post_data.get("answer")
    results = post_data.get("results")
    user_results = post_data.get("user_results")
    
    try:
        # Create score directly like monolithic version
        score = Score(
            user_id=user_id,
            exercise_id=exercise_id,
            answer=answer,
            results=results,
            user_results=user_results,
        )
        db.session.add(score)
        db.session.commit()
        
        response_object["status"] = "success"
        response_object["message"] = "New score was added!"
        response_object["data"] = score.to_json()
        logger.info(f"Score {score.id} created successfully for user {user_id}")
        return jsonify(response_object), 201
        
    except (exc.IntegrityError, ValueError) as e:
        logger.error(f"Database error creating score for user {user_id}: {str(e)}")
        db.session.rollback()
        return jsonify(response_object), 400

@scores_blueprint.route("/<exercise_id>", methods=["PUT"])
@authenticate
def update_score(user_data, exercise_id):
    """Update score by exercise_id (matching monolithic pattern)"""
    user_id = user_data.get('id')
    logger.info(f"Updating score for exercise {exercise_id} by user {user_id}")
    
    response_object = {"status": "fail", "message": "Invalid payload."}

    try:
        post_data = request.json  # Using request.json like monolithic version
        if not post_data:
            logger.warning("Empty payload received for score update")
            return jsonify(response_object), 400

        answer = post_data.get("answer")
        results = post_data.get("results")
        user_results = post_data.get("user_results")
        
        if answer is None and results is None and user_results is None:
            response_object["message"] = "No fields to update in payload!"
            logger.warning("No update fields provided")
            return jsonify(response_object), 400

        # Find score by exercise_id and user_id (matching monolithic pattern)
        score = Score.query.filter_by(exercise_id=int(exercise_id), user_id=user_id).first()
        if score:
            # Update fields if provided
            if answer is not None:
                score.answer = answer
            if results is not None:
                score.results = results
            if user_results is not None:
                score.user_results = user_results
            
            db.session.commit()
            
            response_object["status"] = "success"
            response_object["message"] = "Score was updated!"
            response_object["data"] = score.to_json()
            logger.info(f"Score for exercise {exercise_id} updated successfully for user {user_id}")
            return jsonify(response_object), 200
        else:
            response_object["message"] = "Sorry. That score does not exist."
            logger.warning(f"Score for exercise {exercise_id} not found for user {user_id}")
            return jsonify(response_object), 400
            
    except (exc.IntegrityError, ValueError, TypeError) as e:
        logger.error(f"Database error updating score for exercise {exercise_id}: {str(e)}")
        db.session.rollback()
        response_object["message"] = f"Error: {str(e)} {post_data} {exercise_id}, Error!"
        return jsonify(response_object), 400
    except Exception as e:  # Handle JSON parse errors like monolithic
        logger.error(f"Parse JSON error updating score for exercise {exercise_id}: {str(e)}")
        db.session.rollback()
        response_object["message"] = f"Parse JSON fail: {str(e)}, Error!"
        return jsonify(response_object), 400