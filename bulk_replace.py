import os

directory = 'public/lms'
replacements = {
    'Two Knights': 'ChessKidoo',
    'TWO KNIGHTS': 'CHESSKIDOO',
    'two knights': 'chesskidoo',
    'Two Knights Academy': 'ChessKidoo Academy',
    'TwoKnights': 'ChessKidoo'
}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        new_content = content
        for old, new in replacements.items():
            new_content = new_content.replace(old, new)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f'Updated {filepath}')
    except Exception as e:
        print(f'Error processing {filepath}: {e}')

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.html', '.js', '.css', '.json')):
            filepath = os.path.join(root, file)
            replace_in_file(filepath)
print("Bulk replacement complete.")
