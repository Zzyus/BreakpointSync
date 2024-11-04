// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // run loadBreakpointsFromFile() when the extension is activated
    (async () => {
        await loadBreakpointsFromFile();
    })();
    

    // Function to save breakpoints to a file
    async function saveBreakpointsToFile() {
        const breakpoints = vscode.debug.breakpoints;

        const serializedBreakpoints = breakpoints.map(bp => {
            if (bp instanceof vscode.SourceBreakpoint) {
                const sourceBreakpoint = bp as vscode.SourceBreakpoint;
                return {
                    type: 'source',
                    enabled: sourceBreakpoint.enabled,
                    location: {
                        uri: sourceBreakpoint.location.uri.toString(),
                        range: {
                            startLine: sourceBreakpoint.location.range.start.line,
                            startCharacter: sourceBreakpoint.location.range.start.character,
                            endLine: sourceBreakpoint.location.range.end.line,
                            endCharacter: sourceBreakpoint.location.range.end.character
                        }
                    },
                    condition: sourceBreakpoint.condition,
                    hitCondition: sourceBreakpoint.hitCondition,
                    logMessage: sourceBreakpoint.logMessage
                };
            } else if (bp instanceof vscode.FunctionBreakpoint) {
                const functionBreakpoint = bp as vscode.FunctionBreakpoint;
                return {
                    type: 'function',
                    enabled: functionBreakpoint.enabled,
                    functionName: functionBreakpoint.functionName,
                    condition: functionBreakpoint.condition,
                    hitCondition: functionBreakpoint.hitCondition,
                    logMessage: functionBreakpoint.logMessage
                };
            } else {
                // Unknown breakpoint type
                return null;
            }
        }).filter(bp => bp !== null);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, '.breakpoints.json');
            const jsonString = JSON.stringify(serializedBreakpoints, null, 4);

            try {
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(jsonString, 'utf8'));
            } catch (err) {
                vscode.window.showErrorMessage('Error saving breakpoints: ' + err);
            }
        } else {
            vscode.window.showErrorMessage('No workspace folder found.');
        }
    }

    // Function to load breakpoints from a file
    async function loadBreakpointsFromFile() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, '.breakpoints.json');

            // if file does not exist, create it with empty array
            try {
                await vscode.workspace.fs.stat(fileUri);
            } catch (err) {
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from('[]', 'utf8'));
            }

            try {
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                const jsonString = fileData.toString();
                const serializedBreakpoints = JSON.parse(jsonString);

                const breakpointsToAdd: vscode.Breakpoint[] = serializedBreakpoints.map((bp: any) => {
                    if (bp.type === 'source') {
                        const uri = vscode.Uri.parse(bp.location.uri);
                        const range = new vscode.Range(
                            bp.location.range.startLine,
                            bp.location.range.startCharacter,
                            bp.location.range.endLine,
                            bp.location.range.endCharacter
                        );
                        const location = new vscode.Location(uri, range);

                        const sourceBreakpoint = new vscode.SourceBreakpoint(
                            location,
                            bp.enabled,
                            bp.condition,
                            bp.hitCondition,
                            bp.logMessage
                        );
                        return sourceBreakpoint;
                    } else if (bp.type === 'function') {
                        const functionBreakpoint = new vscode.FunctionBreakpoint(
                            bp.functionName,
                            bp.enabled,
                            bp.condition,
                            bp.hitCondition,
                            bp.logMessage
                        );
                        return functionBreakpoint;
                    } else {
                        return null;
                    }
                }).filter((bp: vscode.Breakpoint | null): bp is vscode.Breakpoint => bp !== null);

                // Remove all existing breakpoints
                vscode.debug.removeBreakpoints(vscode.debug.breakpoints);

                // Add the loaded breakpoints
                vscode.debug.addBreakpoints(breakpointsToAdd);
            } catch (err) {
                vscode.window.showErrorMessage('Error loading breakpoints: ' + err);
            }
        } else {
            vscode.window.showErrorMessage('No workspace folder found.');
        }
    }

    // Command to save breakpoints
    const disposable2 = vscode.commands.registerCommand('breakpointsync.savebreakpoints', async () => {
        await saveBreakpointsToFile();
    });

    // Command to load breakpoints
    const disposable3 = vscode.commands.registerCommand('breakpointsync.loadbreakpoints', async () => {
        await loadBreakpointsFromFile();
    });

    // Event listener to save breakpoints when they change
    const disposable4 = vscode.debug.onDidChangeBreakpoints(async (event) => {
        await saveBreakpointsToFile();
    });

	const disposable5 = vscode.window.onDidChangeWindowState(async (event) => {
        // reload the breakpoints if the window becomes active again
		if (event.active.valueOf() === true) {
			// sleep for 0.05 seconds
			await new Promise(resolve => setTimeout(resolve, 50));
			// load breakpoints
			await loadBreakpointsFromFile();
		}
    });

	

    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
    context.subscriptions.push(disposable4);
	context.subscriptions.push(disposable5);
}

// This method is called when your extension is deactivated
export function deactivate() {}
