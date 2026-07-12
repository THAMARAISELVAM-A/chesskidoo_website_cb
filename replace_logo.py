with open('public/lms/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('/assets/logo1.png', '/assets/img/new-logo-full.png')
content = content.replace('alt="Two Knights"', 'alt="ChessKidoo"')

with open('public/lms/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Logo replaced in lms/index.html')
