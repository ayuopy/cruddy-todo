const { Pool } = require('pg');

class Queries {
	constructor() {
		this.pool = new Pool({database: "todo"});
		this.pool.connect();
	}

	getEntries(callback) {
		const text = 'SELECT * FROM entries ORDER BY id';
		this.pool.query(text, (err, res) => {
			if (!err) {
				callback(res.rows);
			} else {
				console.log(err);
				callback(500);			
			}
		});
	}

	addEntry(data, callback) {
		let query = { values: [data.id, data.text] };
		this.checkForExistingEntry(query, (exists) => {
			if (!exists) {
				query.text = 'INSERT INTO entries (id, text) VALUES ($1, $2) RETURNING id';
				this.pool.query(query, (err, res) => {
					if (!err) {
						res.rows[0].id === data.id ? callback(200) : callback(500);
					} else {
						console.log(err);
						callback(500);
					}
				});
			} else {
				callback(409);
			}
		});
	}

	checkForExistingEntry(query, callback) {
		query.text = 'SELECT * FROM entries WHERE id = $1 AND text = $2';
		this.pool.query(query, (err, res) => {
			if (!err) {
				callback(res.rowCount);
			} else {
				console.log(err);
				callback(true);
			}
		});
	}

	modifyController(data, callback) {
		if (data.newText) {
			this.modifyText(data, callback);
		} else if (data.newId) {
			this.modifyId(data, callback);
		} else if (data.idArray) {
			this.shiftEntries(data, callback);
		} else {
			callback(400);
		}
	}

	modifyText(data, callback) {
		const query = {
			text: 'UPDATE entries SET text = $1 WHERE id = $2 AND text = $3 RETURNING text',
			values: [data.newText, data.id, data.text]
		}
		this.pool.query(query, (err, res) => {
			if (!err) {
				res.rows[0].text === data.newText ? callback(200) : callback(500);
			} else {
				console.log(err);
				callback(500);
			}
		});
	}

	modifyId(data, callback) {
		this.getEntryById(data.newId, (targetText) => { 
			const text = 'UPDATE entries SET id = $1 WHERE id = $2 AND text = $3 RETURNING id';
			let queries = [
				{text: text, values: [data.newId, data.id, data.text]},
				{text: text, values: [data.id, data.newId, targetText]}
			];
			this.pool.query(queries[0], (err, res) => {
				if (!err) {
					this.pool.query(queries[1], (err, res) => {
						if (!err) {
							res.rows[0].id === data.id ? callback(200) : callback(500);
						} else {
							console.log(err);
							callback(500);
						}
					});
				}
			});
			
		});
	}

	getEntryById(id, callback) {
		const query = {
			text: 'SELECT text FROM entries WHERE id = $1',
			values: [id]
		};
		this.pool.query(query, (err, res) => {
			err ? console.log(err) : callback(res.rows[0].text);			
		});
	}

	shiftEntries(data, callback) {
		// used after deletion
		let idArray = JSON.parse(data.idArray);
		idArray.forEach((id, index) => {
			const query = {
				text: 'UPDATE entries SET id = $1 WHERE id = $2 RETURNING id',
				values: [id - 1, id]
			}
			if (index === idArray.length - 1) {
				this.pool.query(query, (err, res) => {
					if (!err) {
						res.rows[0].id = id - 1 ? callback(200) : callback(500);
					} else {						
						console.log(err);
						callback(500);				
					} 
				});
			} else {
				this.pool.query(query);
				this.pool.on('error', () => callback(500));
			}
		});
	}

	deleteEntry(data, callback) {
		const query = {
			text: 'DELETE FROM entries WHERE id = $1 AND text = $2 RETURNING id',
			values: [data.id, data.text]
		}
		this.pool.query(query, (err, res) => {
			if (!err) {
				if (res.rowCount > 0) {
					res.rows[0].id === data.id ? callback(200) : callback(500);
				} else {
					callback(404);
				}
			} else {				
				console.log(err);
				callback(500);
			}
		});
	}

	endPool() {
		this.pool.end();
	}
}

module.exports = Queries;
