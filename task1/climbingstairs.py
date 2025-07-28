n = int(input("Enter the number of steps: "))

a, b = 1, 1  

for i in range(2, n + 1):
    a, b = b, a + b  

print("Number of distinct ways to climb:", b)
