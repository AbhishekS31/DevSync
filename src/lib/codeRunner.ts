import { Pyodide } from 'pyodide';

let pyodide: Pyodide | null = null;

export const initializePyodide = async () => {
  if (!pyodide) {
    // @ts-ignore
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
    });
  }
  return pyodide;
};

export const runPythonCode = async (code: string): Promise<string> => {
  try {
    const py = await initializePyodide();
    if (!py) throw new Error("Pyodide not initialized");

    // Redirect stdout to capture print statements
    let output = '';
    py.setStdout({
      write: (text: string) => {
        output += text;
      },
    });

    await py.runPythonAsync(code);
    return output;
  } catch (error) {
    return `Error: ${error.message}`;
  }
};

export const runJavaScriptCode = (code: string): string => {
  try {
    let output = '';
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    eval(code);
    console.log = originalConsoleLog;
    return output;
  } catch (error) {
    return `Error: ${error.message}`;
  }
};

export const runCode = async (code: string, language: string): Promise<string> => {
  switch (language.toLowerCase()) {
    case 'python':
      return runPythonCode(code);
    case 'javascript':
      return runJavaScriptCode(code);
    default:
      return `Language '${language}' is not supported in the browser environment.
For C++, Java, and other compiled languages, please use the terminal to compile and run locally.`;
  }
};