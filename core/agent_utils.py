import re

def parse_metadata(output: str) -> dict:
    """Shared parser for the common base metadata fields. Used by all 5 agents."""
    confidence_match = re.search(r"CONFIDENCE:\s*(\d+)", output)
    missing_match = re.search(r"MISSING_INFO:\s*(.+?)(?=\nINTERNAL_CONFLICTS:|$)", output, re.DOTALL)
    conflicts_match = re.search(r"INTERNAL_CONFLICTS:\s*(.+)", output, re.DOTALL)

    missing_raw = missing_match.group(1).strip() if missing_match else "NONE"
    conflicts_raw = conflicts_match.group(1).strip() if conflicts_match else "NONE"

    return {
        "confidence": int(confidence_match.group(1)) if confidence_match else 5,
        "missing_information": None if missing_raw.upper() == "NONE" else missing_raw,
        "internal_conflicts": None if conflicts_raw.upper() == "NONE" else conflicts_raw,
    }

def strip_metadata_block(output: str) -> str:
    """Removes the metadata block from display text and strips LLM thinking."""
    # First, strip the metadata block
    clean_output = re.split(r"\nCONFIDENCE:", output)[0].strip()
    
    # Strip LLM thinking by finding the last block of bullet points
    blocks = re.split(r'\n\s*\n', clean_output)
    for block in reversed(blocks):
        # Look for a block that contains bullet points
        if re.search(r'^[ \t]*[-*•]', block, re.MULTILINE):
            # Extract from the first bullet point onwards in this block
            match = re.search(r'(?m)^[ \t]*[-*•].*$', block, re.DOTALL)
            if match:
                return match.group(0).strip()
                
    return clean_output
