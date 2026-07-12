import os

filepath = r'g:\codebase\MY\CHESSKIDOO_CODEBASE\lms\index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('min="2026-06"', 'min="2026-01"')
content = content.replace('min="2026-07"', 'min="2026-01"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated min properties in lms/index.html')
