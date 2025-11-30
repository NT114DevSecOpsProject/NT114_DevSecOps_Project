import logging
import sys
import os
from datetime import datetime


def setup_logger():
    """Setup logger configuration"""
    # Use /tmp for logs in Kubernetes (writable directory)
    log_dir = os.getenv('LOG_DIR', '/tmp/logs')
    os.makedirs(log_dir, exist_ok=True)

    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Create formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler for general logs
    file_handler = logging.FileHandler(f'{log_dir}/auth_service.log')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # File handler for error logs
    error_handler = logging.FileHandler(f'{log_dir}/auth_error.log')
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    return logger


def get_logger(name):
    """Get logger for specific module"""
    return logging.getLogger(name)