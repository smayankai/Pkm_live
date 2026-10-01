const tournamentId = "6abb9a23880ed327106df304";

const urls = [
  `https://play.limitlesstcg.com/api/tournaments/${tournamentId}/pairings`,
  `https://play.limitlesstcg.com/api/tournaments/${tournamentId}/matches`,
  `https://play.limitlesstcg.com/api/tournaments/${tournamentId}/results`,
];

for (const url of urls) {
  console.log(`\nTesting: ${url}`);

  const response = await fetch(url);

  console.log(`Status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();

    console.log(
      Array.isArray(data)
        ? `Received array with ${data.length} records`
        : "Received object"
    );

    console.dir(
      Array.isArray(data) ? data.slice(0, 20) : data,
      { depth: null }
    );
  }
}