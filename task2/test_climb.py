from climb import climb_stairs

def test_climb_stairs():
    assert climb_stairs(0) == 0
    assert climb_stairs(1) == 1
    assert climb_stairs(2) == 2
    assert climb_stairs(3) == 3
    assert climb_stairs(4) == 5
    assert climb_stairs(5) == 8
