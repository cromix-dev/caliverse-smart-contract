// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract EthDistributer {
  function distribute(address payable[] memory addresses, uint256[] memory amounts) public payable {
    require(addresses.length == amounts.length, "length of addresses and tokenIds must be equal");
    uint256 total=0;
    for(uint256 i=0;i<amounts.length;i++){
      total+=amounts[i];
    }
    refundIfOver(total);
    for(uint256 i=0;i<addresses.length;i++){
      addresses[i].transfer(amounts[i]);
    }
  }

  function refundIfOver(uint256 value_) private {
    require(msg.value >= value_, "Need to send more ETH.");
    if (msg.value > value_) {
      payable(msg.sender).transfer(msg.value - value_);
    }
  }
}