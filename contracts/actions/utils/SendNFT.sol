// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/IERC721.sol";
import "../ActionBase.sol";

/// @title Helper action to send a NFT token to the specified address
contract SendNFT is ActionBase {

    struct Params {
        address nftAddr;
        address to;
        uint256 nftId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.nftAddr = _parseParamAddr(inputData.nftAddr, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);
        inputData.nftId = _parseParamUint(inputData.nftId, _paramMapping[2], _subData, _returnValues);

        _sendNFT(inputData.nftAddr, inputData.to, inputData.nftId);

        return bytes32(inputData.nftId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _sendNFT(inputData.nftAddr, inputData.to, inputData.nftId);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    /// @param _nftAddr Address of the ERC721 contract
    /// @param _to Address where we are sending the nft
    /// @param _nftId TokenId we are sending
    function _sendNFT(address _nftAddr, address _to, uint _nftId) internal {
        require(_to != address(0), "Can't burn nft");

        IERC721(_nftAddr).safeTransferFrom(address(this), _to, _nftId);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
