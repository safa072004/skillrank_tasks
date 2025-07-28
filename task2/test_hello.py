import pytest
from hello import say_hello

@pytest.mark.parametrize("expected", [
    "Hello World",
])
def test_say_hello(expected):
    assert say_hello() == expected
