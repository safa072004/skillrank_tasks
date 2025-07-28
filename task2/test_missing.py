import pytest
from missing import find_missing_number

@pytest.mark.parametrize("nums, n, expected", [
    ([1, 2, 4, 5], 5, 3),
    ([2, 3, 1, 5], 5, 4),
])
def test_find_missing_number(nums, n, expected):
    assert find_missing_number(nums, n) == expected
