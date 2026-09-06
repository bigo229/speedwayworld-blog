import os
import re
import yaml

# '.' means it will look inside the exact folder where this script is placed
BLOG_DIR = '.' 

def clean_title(title):
    """Cleans all-caps titles and formats them nicely."""
    title = title.strip().strip('"').strip("'")
    if title.isupper():
        title = title.title()
    return title

def generate_description(title, content_body):
    """Generates a clean meta description from the first sentence if generic."""
    clean_text = re.sub(r'[*#`\[\]\(\)]', '', content_body).strip()
    lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
    if lines:
        first_line = lines[0]
        if len(first_line) > 150:
            return first_line[:147] + "..."
        return first_line
    return "Latest speedway racing updates and results regarding {}.".format(title)

def optimize_markdown_content(file_path):
    with open(file_path, 'r') as f:
        file_content = f.read()

    # Split frontmatter metadata from the main content body
    match = re.match(r'^---([\s\S]*?)---([\s\S]*)$', file_content)
    if not match:
        return 

    frontmatter_raw = match.group(1)
    body_content = match.group(2).strip()

    try:
        # Lubuntu 16.04 uses an older PyYAML version, safe_load is best
        metadata = yaml.safe_load(frontmatter_raw)
    except Exception:
        return 

    if not metadata:
        return

    # 1. Optimize Title
    original_title = metadata.get('title', '')
    optimized_title = clean_title(original_title)
    metadata['title'] = optimized_title

    # 2. Fix Default Generic Placeholder Descriptions
    desc = metadata.get('description', '')
    if not desc or "short, crisp summary" in desc or desc == original_title:
        metadata['description'] = generate_description(optimized_title, body_content)

    # 3. Clean Content Body (Remove duplicate titles at the top of content)
    body_lines = body_content.split('\n')
    if body_lines:
        first_line = body_lines[0].strip().replace('#', '').replace('*', '').strip()
        if first_line.upper() == original_title.upper() or first_line.upper() == optimized_title.upper():
            body_lines.pop(0)
            body_content = '\n'.join(body_lines).strip()

    # 4. Format scores / comma lists into structural markdown list tables
    score_pattern = r'([A-Z\s]{4,})\s(\d+):'
    if re.search(score_pattern, body_content):
        lines = body_content.split('\n')
        new_lines = []
        for line in lines:
            if ':' in line and ',' in line and any(char.isdigit() for char in line):
                parts = line.split(':', 1)
                team_info = parts[0].strip()
                scorers = parts[1].split(',')
                
                new_lines.append("\n### 🏁 {}".format(team_info.title()))
                for scorer in scorers:
                    s_clean = scorer.strip()
                    s_match = re.match(r'^([A-Za-z\s]+)\s([\d\++]+)$', s_clean)
                    if s_match:
                        new_lines.append("* **{}**: {}".format(s_match.group(1).strip(), s_match.group(2)))
                    else:
                        new_lines.append("* {}".format(s_clean))
            else:
                new_lines.append(line)
        body_content = '\n'.join(new_lines).strip()

    # 5. Clean up extra line breaks
    body_content = re.sub(r'\n{3,}', '\n\n', body_content)
    
    # Save clean YAML metadata
    optimized_frontmatter = yaml.dump(metadata, default_flow_style=False, allow_unicode=True).strip()
    optimized_file_text = "---\n{}\n---\n\n{}\n".format(optimized_frontmatter, body_content)

    # Save the file overwrite safely
    with open(file_path, 'w') as f:
        f.write(optimized_file_text)
    print("✓ Optimized: {}".format(os.path.basename(file_path)))

# Execute loop across files
for filename in os.listdir(BLOG_DIR):
    if filename.endswith('.md') or filename.endswith('.markdown'):
        if filename != "README.md":
            optimize_markdown_content(os.path.join(BLOG_DIR, filename))

print("\n🎉 Bulk SEO Optimization Complete!")

