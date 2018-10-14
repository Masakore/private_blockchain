/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

//Method to fetch all data from LevelDB
function loadDataFromLevelDB () {
	return new Promise(function(resolve, reject){
		let dataArray = [];
		db.createReadStream()
		.on('data', function (data) {
		  dataArray.push(data)
		})
		.on('error', function (err) {
		  reject(err)
		})
		.on('close', function () {
		  resolve(dataArray);
		});
	});
};

function addLevelDBData(key,value){
  return new Promise(function(resolve, reject){
		db.put(key, value, function(err) {
	    if(err){
				reject('Block ' + key + ' submission failed' + err)
				console.log('Should not be called');
			}
			resolve('Block Added')
	  });
	});
}

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
	  this.chain = [];
		loadDataFromLevelDB().then((data) => {
			if(data.length === 0){
	      this.addBlock(new Block("First block in the chain - Genesis block"));
			} else {
	      this.chain = data;
			}
		}).catch((error) => {
			console.error(error);
		});
  }

  // Add new block
  addBlock(newBlock){
		return new Promise((resolve, reject) => {
			loadDataFromLevelDB().then((data) => {
		    this.chain = data
		    // Block height
		    newBlock.height = this.chain.length;
		    // UTC timestamp
		    newBlock.time = new Date().getTime().toString().slice(0,-3);
		    // previous block hash
		    if(this.chain.length>0){
		      newBlock.previousBlockHash = this.chain[this.chain.length-1].hash;
		    }
		    // Block hash with SHA256 using newBlock and converting to a string
		    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
		    // Adding block object to chain
		  	this.chain.push(newBlock);

				addLevelDBData(this.chain.length - 1, newBlock).then((data) => {
					resolve(data)
				}).catch((error) => {
					reject(error);
				});
			}).catch((error) => {
				console.error(error);
			});
		});
  }

  // Get block height
  getBlockHeight(){
		loadDataFromLevelDB().then((data) => {
      this.chain = data;
      return console.log(this.chain.length-1);
		}).catch((error) => {
			console.error(error);
		});
  }

  // get block
  getBlock(blockHeight){
		return new Promise((resolve, reject) => {
			loadDataFromLevelDB().then((data) => {
	      this.chain = data;
		    // return object as a single string
		    return JSON.parse(JSON.stringify(this.chain[blockHeight]));
			}).catch((error) => {
				console.error(error);
			});
		})
  }

  // validate block
  validateBlock(blockHeight){
		return new Promise((resolve, reject) => {
	    this.getBlock(blockHeight).then((data) => {
	      // get block object
        let block = data
		    // get block hash
		    let blockHash = block.hash;
		    // remove block hash to test block integrity
		    block.hash = '';
		    // generate block hash
		    let validBlockHash = SHA256(JSON.stringify(block)).toString();
		    // Compare
		    if (blockHash===validBlockHash) {
	        return resolve(true);
		    } else {
	        console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
	        return resolve(false);
		    }
			}).catch((error) => {
				reject(error);
			});
		});
  }

  // Validate blockchain
  validateChain(){
    let errorLog = [];
    for (var i = 0; i < this.chain.length-1; i++) {

			this.validateBlock(i).then((result) => {
	      // validate block
	      if (!result)errorLog.push(i);
	      // compare blocks hash link
	      let blockHash = this.chain[i].hash;
	      let previousHash = this.chain[i+1].previousBlockHash;
	      if (blockHash!==previousHash) {
	        errorLog.push(i);
	      }
			}).catch((err) => {
			  console.log(err);

			});
    }
    if (errorLog.length>0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: '+errorLog);
    } else {
      console.log('No errors detected');
    }
  }
}

//create test data set
// (function theLoop (i) {
//   setTimeout(function () {
//     let blockTest = new Block("Test Block - " + (i + 1));
// 		let blockChainTest = new Blockchain();
//     blockChainTest.addBlock(blockTest).then((result) => {
//       console.log(result);
//       i++;
//       if (i < 10) theLoop(i);
//     });
//   }, 10000);
// })(0);
