const tournamentId = "6aad0d0ae905c1db68744103";

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
      Array.isArray(data) ? data.slice(0, 3) : data,
      { depth: null }
    );
  }
}