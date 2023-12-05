// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library LibNFTHolds {
  function removeToken(uint256[] storage _holds, uint256 tokenId) public {
    uint256 targetIndex;

    for (uint256 i = 0; i < _holds.length; i++) {
      uint256 _tokenId = _holds[i];
      if (_tokenId == tokenId) {
        targetIndex = i;
      }
    }

    for (uint256 i = targetIndex; i < _holds.length - 1; i++) {
      _holds[i] = _holds[i + 1];
    }

    _holds.pop();
  }

  function hasTokenId(uint256[] storage _holds, uint256 tokenId) public view returns (bool) {
    for (uint256 i = 0; i < _holds.length; i++) {
      if (_holds[i] == tokenId) {
        return true;
      }
    }

    return false;
  }
}

struct NFTHolds {
  uint256[] _tokenIds;
  mapping(uint256 => uint256) _tokenAmount;
}
