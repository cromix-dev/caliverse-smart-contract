// SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/utils/Address.sol';

pragma solidity ^0.8.12;

library LibSale {
  modifier callerIsUser() {
    ensureCallerIsUser();
    _;
  }

  function ensureCallerIsUser() public view {
    require(tx.origin == msg.sender, 'The caller is another contract');
  }

  function refundIfOver(uint256 price_) public {
    require(msg.value >= price_, 'Need to send more ETH.');
    if (msg.value > price_) {
      Address.sendValue(payable(msg.sender), msg.value - price_);
    }
  }

  function _commonValidation(SaleInfo storage saleInfo, uint256 quantity) public view {
    require(saleInfo.totalMinted + quantity <= saleInfo.limit, 'can not mint this many');
    require(saleInfo.startTime <= block.timestamp && saleInfo.endTime >= block.timestamp, 'not opened');
  }

  function validatePublicSale(SaleInfo storage saleInfo, uint256 quantity) public view {
    _commonValidation(saleInfo, quantity);

    require(saleInfo._mintType == 1, 'public sale not opened');
  }

  function validatePrivateSale(SaleInfo storage saleInfo, uint256 quantity) public view callerIsUser {
    _commonValidation(saleInfo, quantity);

    require(saleInfo._mintType == 2, 'sale not opened');
  }
}

struct SaleInfo {
  uint32 startTime;
  uint32 endTime;
  uint256 price;
  uint256 limit; // 전체 제한이 아니라 이번 세일에서의 제한
  uint32 _mintType; // 1: public sale, 2: allow sale
  uint256 totalMinted;
}
