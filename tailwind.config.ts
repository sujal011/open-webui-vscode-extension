import type { Config } from 'tailwindcss';

export default {
	content: ['./webview/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// VS Code theme integration
				background: 'var(--vscode-editor-background)',
				foreground: 'var(--vscode-foreground)',
				'panel-bg': 'var(--vscode-sideBar-background)',
				'panel-border': 'var(--vscode-sideBar-border)',
				'input-bg': 'var(--vscode-input-background)',
				'input-fg': 'var(--vscode-input-foreground)',
				'input-border': 'var(--vscode-input-border)',
				'button-bg': 'var(--vscode-button-background)',
				'button-fg': 'var(--vscode-button-foreground)',
				'button-hover': 'var(--vscode-button-hoverBackground)',
				'secondary-button-bg': 'var(--vscode-button-secondaryBackground)',
				'secondary-button-fg': 'var(--vscode-button-secondaryForeground)',
				'focus-border': 'var(--vscode-focusBorder)',
				'selection-bg': 'var(--vscode-selection-background)',
				'description-fg': 'var(--vscode-descriptionForeground)',
				'list-hover-bg': 'var(--vscode-list-hoverBackground)',
				'list-selection-bg': 'var(--vscode-list-activeSelectionBackground)',
				'error-fg': 'var(--vscode-errorForeground)',
				'error-bg': 'var(--vscode-inputValidation-errorBackground)',
				'warning-fg': 'var(--vscode-warningForeground)'
			},
			fontFamily: {
				sans: ['var(--vscode-font-family)', 'system-ui', 'sans-serif']
			},
			fontSize: {
				base: 'var(--vscode-font-size)'
			},
			spacing: {
				'xs': '4px',
				'sm': '8px',
				'md': '12px',
				'lg': '16px',
				'xl': '24px',
				'2xl': '32px'
			}
		}
	},
	plugins: []
} as Config;
