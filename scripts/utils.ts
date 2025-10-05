import * as fs from "fs";
import * as path from "path";
import fsExtra from "fs-extra";

/**
 * Removes comments from a JSON string, returning a clean result.
 * @param jsonData
 * @returns
 */
export function removeCommentsFromJSON(jsonData: string): string {
  let result = "";
  let inString = false;
  let inSingleLineComment = false;
  let inBlockComment = false;
  let i = 0;

  while (i < jsonData.length) {
    const char = jsonData[i];
    const nextChar = jsonData[i + 1];

    if (inString) {
      // Check if we encounter an unescaped closing quote
      if (char === '"' && jsonData[i - 1] !== "\\") {
        inString = false;
      }
      result += char;
    } else if (inSingleLineComment) {
      // Single-line comments end with a newline character
      if (char === "\n") {
        inSingleLineComment = false;
        result += char; // Preserve the newline character
      }
    } else if (inBlockComment) {
      // Block comments end with */
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        i++; // Skip the closing '/'
      }
    } else {
      if (char === '"') {
        inString = true;
        result += char;
      } else if (char === "/" && nextChar === "/") {
        inSingleLineComment = true;
        i++; // Skip the next '/'
      } else if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        i++; // Skip the next '*'
      } else {
        result += char;
      }
    }
    i++;
  }

  return result;
}

/**
 * Removes comments & spaces from a `.lang` file, returning a clean result in CRLF format.
 * Supports comments starting with two or more `#` and in-line comments.
 * @param langData
 */
export function removeCommentsFromLang(langData: string): string {
  // Split the data into lines
  const lines = langData.split(/\r?\n/);

  const cleanedLines = lines
    .map((line) => {
      // Remove any in-line comments that have two or more # (e.g., ##, ###, etc.)
      const noInlineComments = line.split(/#{2,}/)[0].trim();

      // Return the line only if it's not empty and not a full-line comment (starting with ## or more #)
      return noInlineComments.length > 0 && !noInlineComments.match(/^#{2,}/)
        ? noInlineComments
        : null;
    })
    .filter(Boolean); // Remove null values

  // Join the cleaned lines with CRLF (\r\n) to maintain Windows-style line breaks
  return cleanedLines.join("\r\n");
}

/**
 * Function to count the total files and folders recursively.
 */
export function countFilesRecursively(directory: string): number {
  let count = 0;
  const items = fs.readdirSync(directory);
  for (const item of items) {
    const fullPath = path.join(directory, item);
    if (fs.lstatSync(fullPath).isDirectory()) {
      count += countFilesRecursively(fullPath);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Edits a section inside a `.lang` file with the given header, and replaces the content.
 * If the section doesn't exist, it will be appended a new section to the end of the file.
 *
 * @param filePath Path to the `.lang` file (will create a new file if not found).
 * @param header A section is a group of lines that start with a header (e.g., `# Header`).
 * @param content Content to replace the section with.
 */
export function editLangSection(
  filePath: string,
  header: string,
  content: string
) {
  if (!fs.existsSync(filePath))
    fs.writeFileSync(filePath, `##${header}\n\n${content}`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split(/\r?\n/);

  // Find the start of the section
  const startIndex = lines.findIndex(
    (line) =>
      // Remove all spaces to compare the header
      line.replace(/[# ]/g, "") == header.replace(/[# ]/g, "")
  );

  if (startIndex === -1) {
    // If the section doesn't exist, append it to the end of the file
    lines.push(`## ${header}`);
    lines.push(content);
  } else {
    // Replace the section with the new content
    const endIndex = lines.findIndex(
      (line, i) => i > startIndex && line.startsWith("#")
    );
    lines.splice(
      startIndex,
      endIndex - startIndex,
      `## ${header}`,
      content,
      ""
    );
  }

  fs.writeFileSync(filePath, lines.join("\r\n"));
}