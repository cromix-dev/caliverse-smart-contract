const HDWalletProvider = require("truffle-hdwallet-provider");

const { WALLET_PK, INFURA_KEY } = process.env;

module.exports = {
  networks: {
    goerli: {
      provider: function () {
        return new HDWalletProvider(WALLET_PK, "https://goerli.infura.io/v3/" + INFURA_KEY);
      },
      from: "",
      port: 8545,
      network_id: "5",
      // gas: 6700000,
      networkCheckTimeout: 100000,
      // gasPrice: 21110000000,
      confirmations: 1,
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(WALLET_PK, "https://mainnet.infura.io/v3/" + INFURA_KEY);
      },
      from: "",
      port: 8545,
      network_id: "1",
      // gasPrice: 17110000000,
      confirmations: 2,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "./node_modules/solc", // Fetch exact version from solc-bin (default: truffle's version)
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
};
