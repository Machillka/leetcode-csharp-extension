import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as cp from 'child_process';

async function pickOrGetWorkspaceRoot(): Promise<string | undefined> {
	const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (ws) return ws;

	const picked = await vscode.window.showOpenDialog({
		openLabel: '选择作为工作区的文件夹',
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false
	});
	return picked?.[0]?.fsPath;
}

function extractLongestNumber(input: string): string | undefined {
	const matches = input.match(/\d+/g);
	if (!matches || matches.length === 0) return undefined;

	return matches.reduce((longest, current) =>
		current.length > longest.length ? current : longest
	);
}

export function activate(context: vscode.ExtensionContext) {
	// 指令 1：初始化工作区（dotnet new + solutions）
	const initCmd = vscode.commands.registerCommand('leetcode-csharp.createWorkspace', async () => {
		try {
			const root = await pickOrGetWorkspaceRoot();
			if (!root) return;

			// 在工作区运行 dotnet new console
			vscode.window.showInformationMessage('正在初始化 .NET console 项目...');
			cp.execSync('dotnet new console', { cwd: root, stdio: 'inherit' });

			// 创建 solutions 文件夹
			const solutionsDir = path.join(root, 'solutions');
			await fs.ensureDir(solutionsDir);

			vscode.window.showInformationMessage('初始化完成：已创建 .NET 项目与 solutions 文件夹。');
		} catch (err: any) {
			vscode.window.showErrorMessage(`初始化失败：${err?.message || err}`);
		}
	});

	// 指令 2：在 solutions 下新建 cs 文件
	const newFileCmd = vscode.commands.registerCommand('leetcode-csharp.createFile', async () => {
		try {
			const root = await pickOrGetWorkspaceRoot();
			if (!root) return;

			const solutionsDir = path.join(root, 'solutions');
			await fs.ensureDir(solutionsDir);

			const name = await vscode.window.showInputBox({
				prompt: '输入 C# 文件名（无需后缀，需包含题号）',
				validateInput: (v: any) => {
					if (!v || !/^[A-Za-z_]\w*$/.test(v)) return '文件名需为合法的 C# 标识符样式';
					return null;
				}
			});
			if (!name) return;

			const filePath = path.join(solutionsDir, `${name}.cs`);
			if (!(await fs.pathExists(filePath))) {
				const codeNumber = extractLongestNumber(name)
				const content =
`namespace Problem${codeNumber}
{
  	public class Solution
	{
		public
	}
}
`;
				await fs.writeFile(filePath, content, 'utf8');
			}

			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
			await vscode.window.showTextDocument(doc);
			vscode.window.showInformationMessage(`已创建/打开: ${name}.cs`);
		} catch (err: any) {
			vscode.window.showErrorMessage(`创建文件失败：${err?.message || err}`);
		}
	});

	context.subscriptions.push(initCmd, newFileCmd);
}

export function deactivate() { }