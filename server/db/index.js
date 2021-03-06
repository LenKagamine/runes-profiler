const firebase = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

const champions = require('../champions.json');
const champNames = require('./champNames.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

function getPlayer(stripName, region) {
  return firebase.database().ref('players/' + stripName + '@' + region).once('value').then(snap => {
    const data = snap.val();
    if (!snap.exists() ||
      !data.name || !data.icon || !data.lastUpdated || !data.runes) { // Not stored
      console.log('Player missing');
      return null;
    }
    else if (Date.now() - data.lastUpdated >= 1000 * 60 * 5) { // Outdated data
      console.log('Player outdated');
      return null;
    }
    else {
      console.log('Player from database');
      return {
        name: data.name,
        icon: data.icon,
        lastUpdated: data.lastUpdated,
        runes: data.runes
      };
    }
  });
}

function updatePlayers(playersData, region) {
  let updatedRunes = {};
  let oldRunes = {};
  let updatedChamp = {};
  let oldChamp = {};

  const promises = Object.entries(playersData).map(
    ([playerName, playerData]) => {
      return updatePlayer(playerName, region, playerData).then(oldData => {
        Object.entries(playerData.runes).forEach(([runeId, runeData]) => {
          if (!updatedRunes[runeId]) {
            updatedRunes[runeId] = {
              wins: 0,
              games: 0,
              stats: [0, 0, 0]
            };
          }

          updatedRunes[runeId].wins += runeData.wins;
          updatedRunes[runeId].games += runeData.games;
          for (let i = 0; i < 3; i++) {
            updatedRunes[runeId].stats[i] += runeData.stats[i];
          }
        });

        Object.entries(oldData.runes).forEach(([runeId, runeData]) => {
          if (!oldRunes[runeId]) {
            oldRunes[runeId] = {
              wins: 0,
              games: 0,
              stats: [0, 0, 0]
            };
          }

          oldRunes[runeId].wins += runeData.wins;
          oldRunes[runeId].games += runeData.games;
          for (let i = 0; i < 3; i++) {
            oldRunes[runeId].stats[i] += runeData.stats[i];
          }
        });

        Object.entries(playerData.champions).forEach(([runeId, runeData]) => {
          if (!updatedChamp[runeId]) {
            updatedChamp[runeId] = {
              keystones: {},
              pages: {}
            };
          }

          Object.entries(runeData.keystones).forEach(
            ([keystoneId, keystoneData]) => {
              if (!updatedChamp[runeId].keystones[keystoneId]) {
                updatedChamp[runeId].keystones[keystoneId] = {
                  wins: 0,
                  games: 0
                };
              }

              updatedChamp[runeId].keystones[keystoneId].wins +=
                keystoneData.wins;
              updatedChamp[runeId].keystones[keystoneId].games +=
                keystoneData.games;
            }
          );

          Object.entries(runeData.pages).forEach(([pageId, pageData]) => {
            if (!updatedChamp[runeId].pages[pageId]) {
              updatedChamp[runeId].pages[pageId] = {
                wins: 0,
                games: 0
              };
            }

            updatedChamp[runeId].pages[pageId].wins += pageData.wins;
            updatedChamp[runeId].pages[pageId].games += pageData.games;
          });
        });

        Object.entries(oldData.champions).forEach(([runeId, runeData]) => {
          if (!oldData[runeId]) {
            oldData[runeId] = {
              keystones: {},
              pages: {}
            };
          }

          Object.entries(runeData.keystones).forEach(
            ([keystoneId, keystoneData]) => {
              if (!oldData[runeId].keystones[keystoneId]) {
                oldData[runeId].keystones[keystoneId] = {
                  wins: 0,
                  games: 0
                };
              }

              oldData[runeId].keystones[keystoneId].wins += keystoneData.wins;
              oldData[runeId].keystones[keystoneId].games += keystoneData.games;
            }
          );

          Object.entries(runeData.pages).forEach(([pageId, pageData]) => {
            if (!oldData[runeId].pages[pageId]) {
              oldData[runeId].pages[pageId] = {
                wins: 0,
                games: 0
              };
            }

            oldData[runeId].pages[pageId].wins += pageData.wins;
            oldData[runeId].pages[pageId].games += pageData.games;
          });
        });

        return Promise.resolve();
      });
    }
  );

  Promise.all(promises).then(() => {
    updateGlobal(updatedRunes, oldRunes);
    updateChampion(updatedChamp, oldChamp);
  });
}

function updatePlayer(stripName, region, updatedData) {
  const ref = firebase.database().ref('players/' + stripName + '@' + region);

  return ref.once('value').then(snap => {
    const data = snap.val();
    ref.set({
      ...updatedData,
      lastUpdated: Date.now()
    });

    if (snap.exists()) {
      return data;
    }
    // Not stored
    return { runes: {}, champions: {} };
  });
}

function getGlobal() {
	return firebase.database().ref('runes').once('value').then(snap => {
    // if (snap.exists()) return snap.val();
    // throw 'Global missing';
    return snap.val();
	});
}

function updateGlobal(updatedData, oldData) {
	console.log('update global', updatedData);
	const globalRef = firebase.database().ref('runes');

	globalRef.once('value', snap => {
		const globalData = snap.val();
		const updatedGlobalData = Object.entries(updatedData).reduce((acc, [runeId, rune]) => {
			if (!acc[runeId]) {
				acc[runeId] = {
					wins: 0,
					games: 0,
					stats: [0, 0, 0]
				};
			}

			let temp = {
				wins: 0,
				games: 0,
				stats: [0, 0, 0]
			};
			if (oldData[runeId]) {
				Object.assign(temp, oldData[runeId]);
			}

			acc[runeId].wins += rune.wins - temp.wins;
			acc[runeId].games += rune.games - temp.games;
			for (let i = 0; i < 3; i++) {
				acc[runeId].stats[i] += rune.stats[i] - temp.stats[i];
			}
			return acc;
		}, globalData || {});
		console.log(globalData);
		console.log(updatedGlobalData)
		globalRef.set(updatedGlobalData);
	});
}

function getChampion(championName, callback) {
	firebase.database().ref('champions/' + championName).once('value', snap => {
		const data = snap.val();
		if (data === undefined || data == null) {
			callback({
				name: champNames[championName]
			});
		}
		else {
			callback(data);
		}
	});
}

function updateChampion(updatedData, oldData) {
	Object.entries(updatedData).forEach(([championId, championData]) => {

    console.log(championId, champions[championId]);
    if (!champions[championId]) return;

		const stripName = champions[championId].replace(/\s+/g, '').toLowerCase();
		const ref = firebase.database().ref('champions/' + stripName);
		ref.once('value', snap => {
			let data = snap.val();

			if (data === undefined || data === null) {
				data = {
					name: champions[championId],
					key: championId,
					keystones: {},
					pages: {}
				};
			}

			if (oldData[championId] && oldData[championId].keystones) {
				Object.entries(oldData[championId].keystones).forEach(([runeId, runeData]) => {
					if (data.keystones[runeId]) {
						data.keystones[runeId] = {
							wins: data.keystones[runeId].wins - runeData.wins,
							games: data.keystones[runeId].games - runeData.games
						}
					}
				});
			}
			if (oldData[championId] && oldData[championId].pages) {
				Object.entries(oldData[championId].pages).forEach(([pageId, pageData]) => {
					if (data.pages[pageId]) {
						data.pages[pageId] = {
							wins: data.pages[pageId].wins - pageData.wins,
							games: data.pages[pageId].games - pageData.games
						}
					}
				});
			}

			Object.entries(championData.keystones).forEach(([runeId, runeData]) => {
				if (!data.keystones[runeId]) {
					data.keystones[runeId] = {
						wins: runeData.wins,
						games: runeData.games
					};
				}
				else {
					data.keystones[runeId] = {
						wins: data.keystones[runeId].wins + runeData.wins,
						games: data.keystones[runeId].games + runeData.games
					}
				}
			});

			Object.entries(championData.pages).forEach(([pageId, pageData]) => {
				if (!data.pages[pageId]) {
					data.pages[pageId] = {
						wins: pageData.wins,
						games: pageData.games
					};
				}
				else {
					data.pages[pageId] = {
						wins: data.pages[pageId].wins + pageData.wins,
						games: data.pages[pageId].games + pageData.games
					}
				}
			});

			ref.set(data);
		});
	});
}

module.exports = {
	getPlayer,
	updatePlayers,
	getGlobal,
	getChampion
};
