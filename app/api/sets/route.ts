// Kept as a compatibility endpoint. Catalog lookup is now a local static-data
// operation, so no visitor or owner Rebrickable credential is used.
export async function POST(){return Response.json({error:'Set lookup has moved to the bundled catalog. Refresh BrickForge to use the no-key inventory importer.'},{status:410})}
