import { getDocs, findClasses } from './config.js';

async function main() {
	console.log('Carregando Docs.json...');
	const data = await getDocs();
	console.log(`Total de categorias: ${data.length}\n`);

	const items = findClasses(data, 'FGItemDescriptor');
	const recipes = findClasses(data, 'FGRecipe');
	const buildings = findClasses(data, 'FGBuildingDescriptor');

	console.log(`Itens encontrados: ${items.length}`);
	console.log(`Receitas encontradas: ${recipes.length}`);
	console.log(`Edifícios encontrados: ${buildings.length}`);

	console.log('\n--- Primeiros 5 itens ---');
	for (const item of items.slice(0, 5)) {
		const name = (item.mDisplayName as string | undefined) ?? item.ClassName;
		console.log(`  ${item.ClassName}: ${name}`);
	}

	console.log('\n--- Primeiras 5 receitas ---');
	for (const recipe of recipes.slice(0, 5)) {
		const name = (recipe.mDisplayName as string | undefined) ?? recipe.ClassName;
		console.log(`  ${recipe.ClassName}: ${name}`);
	}
}

main().catch(console.error);
