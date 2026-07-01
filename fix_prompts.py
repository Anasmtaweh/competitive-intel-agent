"""One-shot script to clean up all agent prompts.
Removes any <think>, <output>, ENCLOSE FINAL OUTPUT, THINKING instructions
and replaces with a simple 'no chain-of-thought' rule.
"""
import glob
import re

for filename in glob.glob("agents/*.py"):
    with open(filename, "r") as f:
        content = f.read()

    # Remove any rule 15 we added (ENCLOSE FINAL OUTPUT / THINKING variants)
    content = re.sub(
        r'15\. ENCLOSE FINAL OUTPUT:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )
    content = re.sub(
        r'15\. THINKING:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )
    # For verdict.py (no "15." prefix)
    content = re.sub(
        r'ENCLOSE FINAL OUTPUT:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )
    content = re.sub(
        r'THINKING:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )
    # Also remove any "DIRECT OUTPUT ONLY" rule if it got in
    content = re.sub(
        r'15\. DIRECT OUTPUT ONLY:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )
    content = re.sub(
        r'DIRECT OUTPUT ONLY:.*?\n\nOUTPUT FORMAT',
        'OUTPUT FORMAT',
        content, flags=re.DOTALL
    )

    with open(filename, "w") as f:
        f.write(content)

    print(f"Cleaned: {filename}")

print("\nDone. All agent prompts reverted.")
