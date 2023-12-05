// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

pragma solidity ^0.8.0;

contract TokenDistributer {
  function distributeERC721(address contractAddress, address[] memory addresses, uint256[] memory tokenIds) public {
    require(addresses.length<=300,"you can distribute tokens to less than 300 addresses");
    require(addresses.length == tokenIds.length, "length of addresses and tokenIds must be equal");

    for(uint256 i=0;i<addresses.length;i++){
      IERC721(contractAddress).safeTransferFrom(msg.sender, addresses[i], tokenIds[i]);
    }
  }

  function distributeERC20(address contractAddress, address[] memory addresses, uint256[] memory amounts) public {
    require(addresses.length<=300,"you can distribute tokens to less than 300 addresses");
    require(addresses.length == amounts.length, "length of addresses and tokenIds must be equal");

    for(uint256 i=0;i<addresses.length;i++){
      IERC20(contractAddress).transferFrom(msg.sender,addresses[i],amounts[i]);
    }
  }
}