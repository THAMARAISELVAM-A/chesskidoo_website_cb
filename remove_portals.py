import re

def remove_blocks(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    ids_to_remove = ['login-page', 'admin-page', 'student-page', 'coach-page', 'parent-page']
    
    for div_id in ids_to_remove:
        pattern = f'<div[^>]*id=[\"\']{div_id}[\"\'][^>]*>'
        match = re.search(pattern, content)
        while match:
            start_idx = match.start()
            
            # Find the matching closing div
            depth = 0
            curr_idx = start_idx
            
            while curr_idx < len(content):
                # We need to find '<div' and '</div'
                next_open = content.find('<div', curr_idx)
                next_close = content.find('</div', curr_idx)
                
                if next_close == -1:
                    break
                    
                if next_open != -1 and next_open < next_close:
                    depth += 1
                    curr_idx = next_open + 4
                else:
                    depth -= 1
                    curr_idx = next_close + 5
                    if depth == 0:
                        # Found the matching closing div. Add the '>' to close it.
                        closing_bracket = content.find('>', curr_idx)
                        end_idx = closing_bracket + 1
                        # Remove from start_idx to end_idx
                        content = content[:start_idx] + content[end_idx:]
                        break
            
            # Search again in case there are multiple (though unlikely for these ids)
            match = re.search(pattern, content)
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

remove_blocks('index.html')
print('Removed specified portal blocks from index.html')
