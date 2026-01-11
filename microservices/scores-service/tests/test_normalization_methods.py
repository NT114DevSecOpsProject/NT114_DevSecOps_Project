"""
Test normalization methods in models.py
"""
import pytest
from datetime import datetime, timezone
from app.models import Score


class TestNormalizeResults:
    """Test Score._normalize_results static method"""

    def test_normalize_results_none(self):
        """Empty results should return ([], False)"""
        arr, all_correct = Score._normalize_results(None)
        assert arr == []
        assert all_correct is False

    def test_normalize_results_empty_list(self):
        """Empty list should return ([], False)"""
        arr, all_correct = Score._normalize_results([])
        assert arr == []
        assert all_correct is False

    def test_normalize_results_dict_with_passed_true(self):
        """Dict with 'passed': True"""
        arr, all_correct = Score._normalize_results({"passed": True})
        assert arr == [True]
        assert all_correct is True

    def test_normalize_results_dict_with_passed_false(self):
        """Dict with 'passed': False"""
        arr, all_correct = Score._normalize_results({"passed": False})
        assert arr == [False]
        assert all_correct is False

    def test_normalize_results_dict_with_test_results_list(self):
        """Dict with 'test_results' as list"""
        arr, all_correct = Score._normalize_results({
            "test_results": [True, True, False]
        })
        assert arr == [True, True, False]
        assert all_correct is False

    def test_normalize_results_dict_with_test_results_all_true(self):
        """Dict with all True test_results"""
        arr, all_correct = Score._normalize_results({
            "test_results": [True, True, True]
        })
        assert arr == [True, True, True]
        assert all_correct is True

    def test_normalize_results_dict_without_passed_or_test_results(self):
        """Dict without 'passed' or 'test_results'"""
        arr, all_correct = Score._normalize_results({"other": "value"})
        assert arr == [True]
        assert all_correct is True

    def test_normalize_results_list(self):
        """Plain list of booleans"""
        arr, all_correct = Score._normalize_results([True, False, True])
        assert arr == [True, False, True]
        assert all_correct is False

    def test_normalize_results_list_all_true(self):
        """List with all True"""
        arr, all_correct = Score._normalize_results([True, True])
        assert arr == [True, True]
        assert all_correct is True

    def test_normalize_results_truthy_value(self):
        """Single truthy value (non-zero integer)"""
        arr, all_correct = Score._normalize_results(1)
        assert arr == [True]
        assert all_correct is True

    def test_normalize_results_falsy_value(self):
        """Single falsy value (0) - treated as empty/None by _normalize_results"""
        arr, all_correct = Score._normalize_results(0)
        # 0 is falsy, so _normalize_results treats it like None/empty
        assert arr == []
        assert all_correct is False


class TestNormalizeUserResults:
    """Test Score._normalize_user_results static method"""

    def test_normalize_user_results_none(self):
        """None should return []"""
        assert Score._normalize_user_results(None) == []

    def test_normalize_user_results_empty_dict(self):
        """Empty dict should return []"""
        assert Score._normalize_user_results({}) == []

    def test_normalize_user_results_dict(self):
        """Dict should return list of stringified values"""
        result = Score._normalize_user_results({"a": 1, "b": "test", "c": True})
        assert len(result) == 3
        assert "1" in result
        assert "test" in result
        assert "True" in result

    def test_normalize_user_results_list(self):
        """List should return stringified list"""
        result = Score._normalize_user_results([1, "two", 3.14, False])
        assert result == ["1", "two", "3.14", "False"]

    def test_normalize_user_results_empty_list(self):
        """Empty list should return []"""
        assert Score._normalize_user_results([]) == []

    def test_normalize_user_results_single_value(self):
        """Single value should return [str(value)]"""
        assert Score._normalize_user_results(42) == ["42"]
        assert Score._normalize_user_results("test") == ["test"]


class TestIsoOrNone:
    """Test Score._iso_or_none static method"""

    def test_iso_or_none_with_datetime(self):
        """datetime should return ISO format"""
        dt = datetime(2026, 1, 11, 12, 30, 45, tzinfo=timezone.utc)
        result = Score._iso_or_none(dt)
        assert result == "2026-01-11T12:30:45+00:00"

    def test_iso_or_none_with_none(self):
        """None should return None"""
        assert Score._iso_or_none(None) is None


class TestToJsonWithNormalization:
    """Test Score.to_json with normalization"""

    def test_to_json_with_dict_results(self):
        """to_json should normalize dict results"""
        # Create Score with required arguments
        score = Score(user_id=10, exercise_id=5)
        score.id = 1
        score.answer = "def test(): pass"
        # When dict has "passed", it returns [passed_value], ignoring test_results
        score.results = {"passed": True, "test_results": [True, True]}
        score.user_results = ["output1", "output2"]
        score.created_at = datetime(2026, 1, 11, tzinfo=timezone.utc)
        score.updated_at = None

        json_data = score.to_json()
        
        assert json_data["id"] == 1
        assert json_data["user_id"] == 10
        assert json_data["exercise_id"] == 5
        # "passed" key takes priority, returns [True]
        assert json_data["results"] == [True]
        assert json_data["all_correct"] is True
        assert json_data["user_results"] == ["output1", "output2"]
        assert json_data["created_at"] == "2026-01-11T00:00:00+00:00"
        assert json_data["updated_at"] is None

    def test_to_json_with_list_results(self):
        """to_json should handle list results"""
        score = Score(user_id=20, exercise_id=10)
        score.id = 2
        score.answer = "test"
        score.results = [True, False, True]
        score.user_results = {"test1": "pass", "test2": "fail"}
        score.created_at = None
        score.updated_at = datetime(2026, 1, 11, 10, 30, tzinfo=timezone.utc)

        json_data = score.to_json()
        
        assert json_data["results"] == [True, False, True]
        assert json_data["all_correct"] is False
        assert len(json_data["user_results"]) == 2
        assert "pass" in json_data["user_results"]
        assert "fail" in json_data["user_results"]
        assert json_data["created_at"] is None
        assert json_data["updated_at"] == "2026-01-11T10:30:00+00:00"

    def test_to_json_with_none_results(self):
        """to_json should handle None results"""
        score = Score(user_id=30, exercise_id=15)
        score.id = 3
        score.answer = None
        score.results = None
        score.user_results = None
        score.created_at = None
        score.updated_at = None

        json_data = score.to_json()
        
        assert json_data["results"] == []
        assert json_data["all_correct"] is False
        assert json_data["user_results"] == []