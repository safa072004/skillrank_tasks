def find_missing_number(nums):
    n = len(nums)
    expected_sum = n * (n + 1) // 2
    actual_sum = sum(nums)
    return expected_sum - actual_sum
size = int(input("Enter the number of elements : "))
print(f"Enter {size} elements :")
nums = []
for _ in range(size):
    num = int(input())
    nums.append(num)

missing = find_missing_number(nums)
print("Missing number is:", missing)
