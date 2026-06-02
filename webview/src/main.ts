import { installStorageShim } from '$compat/storage';
import './tailwind.css';
import './open-webui-app.css';
import 'tippy.js/dist/tippy.css';
import { mount } from 'svelte';
import App from './App.svelte';

installStorageShim();

// Match Open WebUI dark-first UI inside VS Code
document.documentElement.classList.add('dark');

const app = mount(App, {
	target: document.getElementById('app') as HTMLElement
});

export default app;
