// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC721 } from "../../interfaces/IERC721.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to transfer a NFT token to the specified address.
contract TransferNFT is ActionBase {

    /// @param nftAddr Address of the NFT contract
    /// @param from Address of the sender
    /// @param to Address of the recipient
    /// @param nftId ID of the NFT to transfer
    struct Params {
        address nftAddr;
        address from;
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
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);
        inputData.nftId = _parseParamUint(inputData.nftId, _paramMapping[3], _subData, _returnValues);

        _transferNFT(inputData.nftAddr, inputData.from, inputData.to, inputData.nftId);

        return bytes32(inputData.nftId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _transferNFT(inputData.nftAddr, inputData.from, inputData.to, inputData.nftId);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    /// @notice The user's wallet must have approve if _from != user's wallet.
    /// @param _nftAddr Address of the ERC721 contract
    /// @param _from Where from we are pulling the nft (defaults to user's wallet)
    /// @param _to Address where we are transferring the nft
    /// @param _nftId TokenId we are transferring
    function _transferNFT(address _nftAddr, address _from, address _to, uint _nftId) internal {
        require(_to != address(0), "Can't burn nft");

        if (_from == address(0)) {
            _from = address(this);
        }

        IERC721(_nftAddr).transferFrom(_from, _to, _nftId);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
