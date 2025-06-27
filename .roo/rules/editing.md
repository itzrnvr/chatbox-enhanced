# File Editing Protocol

## 1. Tool Selection
- Use the most appropriate tool for the job. Prefer `apply_diff` for targeted changes. Use `write_to_file` only for creating new files or for full rewrites when `apply_diff` is not suitable. Use `insert_content` for adding new lines and `search_and_replace` for specific text substitutions.

## 2. `apply_diff` Failure Protocol
- If the `apply_diff` tool fails, you must re-read the file to get the latest content and try the `apply_diff` operation one more time.
- If `apply_diff` fails a second time, you must stop. Do not attempt to use it again.
- After the second failure, you must plan a full file rewrite, incorporating the intended changes. You must then ask the user for approval to perform this full rewrite.

## 3. Full Rewrite Protocol
- Once the user approves a full rewrite, you must execute it using the `write_to_file` tool, providing the complete, corrected file content.
