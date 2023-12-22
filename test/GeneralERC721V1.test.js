const path = require('path');
const _ = require('lodash');
const { Web3 } = require('web3');
const web3 = new Web3('http://localhost:8545');
const GeneralERC721V1 = artifacts.require('../contracts/GeneralERC721/GeneralERC721V1.sol');
const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');
const StakingContract = artifacts.require('../contracts/StakingContract/StakingContract.sol');
const Bignumber = require('bignumber.js');
const { SignTypedDataVersion, signTypedData, TypedDataUtils } = require('@metamask/eth-sig-util');
const { createObjectCsvWriter } = require('csv-writer');
const { mergeMap, interval, takeUntil, Subject, lastValueFrom } = require('rxjs');

const makeData = (mintType, eoaAddress, stakingAddress, nonces, quantity, contractAddress, chainId) => {
  const data = {
    types: {
      // Define the types of your data structure
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      MintData: [
        { name: 'mintType', type: 'uint32' },
        { name: 'externalWallet', type: 'address' },
        { name: 'stakingContract', type: 'address' },
        { name: 'nonces', type: 'uint256[]' },
        { name: 'quantity', type: 'uint256' },
      ],
    },
    primaryType: 'MintData',
    domain: {
      chainId,
      name: 'name',
      version: 'V1',
      verifyingContract: contractAddress,
    },
    message: {
      mintType,
      externalWallet: eoaAddress,
      stakingContract: stakingAddress,
      nonces,
      quantity,
    },
  };

  return data;
};

contract('GeneralERC721V1', (accounts) => {
  let factory, erc721;
  const Account0PK = '0x5915dbddbeb8a44c689dd2e3a8e660042ac2a8c68d80f47f304211d4a8a8b131'.replace(/^0x/, '');
  const maxNFT = 200;

  beforeEach(async () => {
    factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', maxNFT);
    const erc721addr = result.receipt.rawLogs[0].address;
    erc721 = await GeneralERC721V1.at(erc721addr);
    const owner = await erc721.owner();
    console.log({ owner, erc721addr });
  });

  it('get chain id', async () => {
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', 100);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);

    const chainId = await erc721.getChainId();
    console.log(chainId.toNumber());
  });
  it('test public mint from newly deployed contract', async () => {
    const csvWriter = createObjectCsvWriter({
      path: path.resolve(__dirname, './result.csv'),
      header: ['account', 'quantity', 'gasUsed'],
    });
    const nonces = _.range(0, maxNFT);
    const startTime = Math.floor(Date.now() / 1000) - 10000;
    const endTime = Math.floor(Date.now() / 1000) + 10000;
    const saleLimit = maxNFT;
    const price = 0.0001 * 1e18;
    const mintType = 1; // public sale
    await erc721.setSaleInfo(startTime, endTime, price, saleLimit, mintType);

    const staking = await StakingContract.deployed();
    const stakingContract = staking.address;
    const chainIdBN = await erc721.getChainId();
    const chainId = chainIdBN.toNumber();

    const mint = async (id, account, quantity) => {
      console.log('mint: ', { id, account, quantity });
      const externalWalletAddress = account;
      const _nonces = nonces.slice(0, quantity);
      nonces.shift(quantity);
      const data = makeData(
        mintType,
        externalWalletAddress,
        stakingContract,
        _nonces,
        quantity,
        erc721.address,
        chainId,
      );
      const sig = signTypedData({
        data,
        version: SignTypedDataVersion.V4,
        privateKey: Buffer.from(Account0PK, 'hex'),
      });

      const tx = await erc721.publicMint(externalWalletAddress, stakingContract, _nonces, quantity, sig, {
        value: price * quantity,
        from: account,
      });

      console.log(`TX ${id} mined: `, tx.receipt.gasUsed);
      await csvWriter.writeRecords([{ account, quantity, gasUsed: tx.receipt.gasUsed }]);
    };

    await mint(0, accounts[1], 1);
    await mint(1, accounts[1], 1);

    const tokenId = 0;
    console.log('is token staked: ', (await staking.stakingInfo(erc721.address, accounts[1], tokenId)).toNumber());
    await staking.unstake(erc721.address, tokenId, { from: accounts[1] });
    await erc721.setApprovalForAll(staking.address, 1, { from: accounts[1] });
    await staking.stake(erc721.address, tokenId, { from: accounts[1] });
    console.log({ 'staking contract address': staking.address });
  });

  it.only('test allow mint 10000 with 10 account', async () => {
    const csvWriter = createObjectCsvWriter({
      path: path.resolve(__dirname, './result.csv'),
      header: ['account', 'quantity', 'gasUsed'],
    });
    const nonces = _.range(0, 10000);

    const maxNFT = 200;
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', maxNFT);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);

    const startTime = Math.floor(Date.now() / 1000) - 10000;
    const endTime = Math.floor(Date.now() / 1000) + 10000;
    const owner = await erc721.owner();
    const saleLimit = maxNFT;
    const price = 0.0001 * 1e18;
    const mintType = 2;
    await erc721.setSaleInfo(startTime, endTime, price, saleLimit, mintType);

    console.log({ owner, erc721addr });

    const staking = await StakingContract.deployed();
    const stakingContract = staking.address;
    const chainIdBN = await erc721.getChainId();
    const chainId = chainIdBN.toNumber();

    const mint = async (id, account, _nonces, quantity) => {
      console.log('mint: ', { id, account, quantity });
      const externalWalletAddress = account;
      nonces.shift(quantity);
      const data = makeData(mintType, externalWalletAddress, stakingContract, _nonces, quantity, erc721addr, chainId);
      const sig = signTypedData({
        data,
        version: SignTypedDataVersion.V4,
        privateKey: Buffer.from(Account0PK, 'hex'),
      });

      const tx = await erc721.allowMint(externalWalletAddress, stakingContract, _nonces, quantity, sig, {
        value: price * quantity,
        from: account,
      });

      console.log(`TX ${id} mined: `, tx.receipt.gasUsed);
      await csvWriter.writeRecords([{ account, quantity, gasUsed: tx.receipt.gasUsed }]);
    };

    let totalMinted = 0;

    const stopSig$ = new Subject();

    await lastValueFrom(
      interval(300).pipe(
        takeUntil(stopSig$),
        mergeMap(async (i) => {
          if (totalMinted === maxNFT) {
            stopSig$.next();
            return;
          }
          console.log('index: ', i);
          const accountIndex = Math.floor(Math.random() * 10);
          const quantity = 1;
          const account = accounts[accountIndex];
          console.log({ account, quantity, accountIndex });
          const _nonces = nonces.slice(0, quantity);
          await mint(i, account, _nonces, quantity);

          totalMinted += quantity;
          console.log('totalMinted: ', totalMinted);

          if (totalMinted === maxNFT) {
            stopSig$.next();
            return;
          }
        }),
      ),
    );

    // for (let i = 0; i < 10; i++) {
    //   await mint(i, accounts[i], 10);
    // }

    // const gasUsed = await web3.eth.estimateGas({ from: accounts[1], to: tx.receipt.to, data: tx.receipt.input });

    // let allowamount = (await erc721.allowlist(accounts[1])).toNumber();
    // console.log({ allowamount });
    // await erc721.seedAllowlist([accounts[1]], [0]);
    // allowamount = (await erc721.allowlist(accounts[1])).toNumber();
    // console.log({ allowamount, 'accounts[1]': accounts[1] });

    // try {
    //   await erc721.allowMint.call(data, 10, sig, { from: accounts[1] });
    // } catch (err) {
    //   console.log({ err });
    //   assert.equal(err.message, 'VM Exception while processing transaction: revert not eligible for allowlist mint');
    // }
  });
});
