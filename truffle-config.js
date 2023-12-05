const HDWalletProvider = require('truffle-hdwallet-provider');

const { WALLET_PK, INFURA_KEY, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
    },
    sepolia: {
      provider: function () {
        return new HDWalletProvider(WALLET_PK, 'https://sepolia.infura.io/v3/' + INFURA_KEY);
      },
      port: 8545,
      network_id: 11155111,
      gas: 10000000,
      // skipDryRun: true,
      // gasPrice 안쓰면 에러생김
      gasPrice: 20000000000,
      confirmations: 1,
      networkCheckTimeout: 10000000,
    },
    goerli: {
      provider: function () {
        return new HDWalletProvider(WALLET_PK, 'https://goerli.infura.io/v3/' + INFURA_KEY);
      },
      port: 8545,
      network_id: '5',
      gas: 10000000,
      skipDryRun: true,
      // gasPrice 안쓰면 에러생김
      // gasPrice: 20000000000,
      confirmations: 1,
      networkCheckTimeout: 10000000,
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(WALLET_PK, 'https://mainnet.infura.io/v3/' + INFURA_KEY);
      },
      port: 8545,
      network_id: '1',
      // gas: 1000000, // 가스비 25gwei 기준으로 잔고가 0.025eth 있으면 호출 가능.
      // gasPrice: 20000000000, // 25gwei
      skipDryRun: true,
      confirmations: 2,
      networkCheckTimeout: 10000000,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: './node_modules/solc', // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY,
  },
};
