<script lang="ts">
	import DOMPurify from 'dompurify';
	import { marked } from 'marked';

	export let content = '';

	marked.use({
		gfm: true,
		breaks: true
	});

	$: html = DOMPurify.sanitize(marked.parse(content, { async: false }) as string);
</script>

<div class="markdown" dir="auto">
	{@html html}
</div>
