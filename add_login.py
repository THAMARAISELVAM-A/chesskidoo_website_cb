import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

coaches_link_pattern = r'(<button class="nav-link"[^>]*>Coaches</button>)'
new_button = '\n          <a href="/lms/index.html" id="loginNavBtn" class="nav-link btn btn-ghost nav-login" style="padding: 8px 16px; font-size: 0.9rem; text-decoration: none; color: inherit; display: inline-flex; align-items: center; justify-content: center;">Log In</a>'

if re.search(coaches_link_pattern, content):
    content = re.sub(coaches_link_pattern, r'\1' + new_button, content)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Log In button added.")
else:
    print("Could not find Coaches link to append the Login button to")
