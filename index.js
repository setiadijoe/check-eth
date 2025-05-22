import { ethers } from 'ethers';

const BAYC_CONTRACT_ADDRESS = '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB';
const ALCHEMY_API_KEY = 'qUlhOatFtDDVz3nc590K16oCpP_ZUjjE';
const PROVIDER_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

async function main() {
    try {
      const timestamp = parseCLIInput();
      const epochTime = Math.floor(timestamp.getTime() / 1000);
      
      console.log(`🔄 Memproses data untuk timestamp: ${timestamp.toISOString()} (epoch: ${epochTime})`);
  
      const result = await getTotalETHAtTime(epochTime);
      
      console.log('\n📊 Hasil:');
      console.log('=======================');
      console.log(`Tanggal       : ${timestamp.toISOString()}`);
      console.log(`Block Number  : ${result.blockNumber}`);
      console.log(`Total Holders : ${result.holdersCount}`);
      console.log(`Total ETH     : ${parseFloat(result.totalETH).toFixed(4)} ETH`);
      console.log('=======================');
  
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

async function getTotalETHAtTime(epochTime) {
    try {
        // 1. Dapatkan semua pemegang NFT BAYC
        const holders = await getBAYCHolders();
        
        // 2. Dapatkan saldo ETH setiap pemegang pada waktu tertentu
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL, 'mainnet');
        const blockNumber = await getBlockNumberAtTime(provider, epochTime);
        
        let totalETH = ethers.toBigInt(0);
        
        for (const holder of holders) {
            const balance = await provider.getBalance(holder, blockNumber);
            totalETH += ethers.getBigInt(balance);
        }
        
        // Konversi dari Wei ke ETH
        const totalETHInEther = ethers.formatEther(totalETH);
        
        return {
            timestamp: new Date(epochTime * 1000).toISOString(),
            blockNumber,
            totalETH: totalETHInEther,
            holdersCount: holders.length
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

const web3ApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImE3OWY1YWMxLTZkYWItNDZlMy1hM2Q1LTAxODUwMDYzNzE5YyIsIm9yZ0lkIjoiNDQ4MjUyIiwidXNlcklkIjoiNDYxMTk0IiwidHlwZUlkIjoiNzMwMzdlZWMtNzRhYS00ZmIyLWIxNzQtMWYwZGY0MDZkN2E1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDc3OTQwNzEsImV4cCI6NDkwMzU1NDA3MX0.E2yjEnClg-MufWDTvnaET4D9swclk2lTTipOE4hGDFc';

const options = {
    method: 'GET',
    params: {
      chain: '0x1', 
      limit: 5,
      format: 'decimal'
    },
    headers: {
      accept: 'application/json',
      'X-API-Key': web3ApiKey
    }
  };

async function getBAYCHolders() {
    try {
        console.log('⏳ Mengambil data pemilik NFT...');
        
        const response = await fetch(
          `https://deep-index.moralis.io/api/v2/nft/${BAYC_CONTRACT_ADDRESS}/owners`, 
          options
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        return data.result.map(item => item.token_address);
    } catch (err) {
        return err.message;
    }
}

async function getBlockNumberAtTime(provider, epochTime) {
    // Binary search untuk menemukan block number terdekat dengan timestamp
    let low = 0;
    let high = await provider.getBlockNumber();
    let closestBlock = high;
    
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const block = await provider.getBlock(mid);
        
        if (block.timestamp === epochTime) {
            return block.number;
        }
        
        if (block.timestamp < epochTime) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
        
        // Update closest block
        const closestBlockDetails = await provider.getBlock(closestBlock);
        const currentDiff = Math.abs(block.timestamp - epochTime);
        const closestDiff = Math.abs(closestBlockDetails.timestamp - epochTime);
        
        if (currentDiff < closestDiff) {
            closestBlock = block.number;
        }
    }
    
    return closestBlock;
}

function parseCLIInput() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || !args[0].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)) {
      throw new Error(`
        Format input tidak valid. Gunakan:
        $ node bayc-eth.js <timestamp>
        
        Contoh:
        $ node bayc-eth.js 2023-05-15T14:30:00.000Z
      `);
    }
  
    const date = new Date(args[0]);
    if (isNaN(date.getTime())) {
      throw new Error('Timestamp tidak valid');
    }
  
    return date;
  }

// const epochTimeInput = Math.floor(Date.now() / 1000); 
// getTotalETHAtTime(epochTimeInput)
//     .then(result => console.log(result))
//     .catch(error => console.error(error));
main()