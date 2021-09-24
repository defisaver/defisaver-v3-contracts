// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/insta/IInstaIndex.sol";
import "../../interfaces/insta/IInstaMakerDAOMerkleDistributor.sol";
import "../../interfaces/mcd/IManager.sol";

// @notice Transfer Maker vault to DSA account owned by dsproxy, claims INST reward, transfers vault back
contract ClaimInstMaker is ActionBase, DSMath {
    using TokenUtils for address;

    IManager public constant mcdManager =  
        IManager(0x5ef30b9986345249bc32d8928B7ee64DE9435E39);

    IInstaIndex public constant instaAccountBuilder = 
        IInstaIndex(0x2971AdFa57b20E5a416aE5a708A8655A9c74f723);

    IInstaMakerDAOMerkleDistributor public constant rewardDistributor =
        IInstaMakerDAOMerkleDistributor(0xAC838332afc2937FdED89c16a59b2ED8e8e2743c);

    address public constant INST_TOKEN_ADDR = 0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb;
    
    struct Params {
        uint256 index;
        uint256 vaultId;
        uint256 rewardAmount;
        uint256 networthAmount;
        bytes32[] merkleProof;
        address owner;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint tokensClaimed = _claimInst(inputData);

        return bytes32(tokensClaimed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _claimInst(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _claimInst(Params memory _inputData) internal returns (uint tokensClaimed){
        address dsaAddress = instaAccountBuilder.build(address(this), 2, address(0));
        require(dsaAddress != address(0), "Failed building dsa account");

        mcdManager.give(_inputData.vaultId, dsaAddress);

        rewardDistributor.claim(
            _inputData.index,
            _inputData.vaultId,
            dsaAddress,
            _inputData.owner,
            _inputData.rewardAmount,
            _inputData.networthAmount,
            _inputData.merkleProof
        );

        bytes memory spellData = _createSpell(_inputData);
        
        uint instaBalanceBefore = INST_TOKEN_ADDR.getBalance(_inputData.to);
        // calling fallback function of dsaAccount
        (bool success, ) = dsaAddress.call(spellData);

        require(success, "fallback function call failed");
        require(mcdManager.owns(_inputData.vaultId) == address(this), "Vault ownership not transfered back");

        uint instaBalanceAfter = INST_TOKEN_ADDR.getBalance(_inputData.to);
        tokensClaimed = sub(instaBalanceAfter, instaBalanceBefore);
    
        logger.Log(
            address(this),
            msg.sender,
            "ClaimInstMaker",
            abi.encode(_inputData)
        );
    }

    function _createSpell(Params memory _inputData) internal view returns (bytes memory) {

        string[] memory _targetNames = new string[](2);
        bytes[] memory _datas = new bytes[](2);
        address _origin = address(this);

        // connects dsaAccount with BASIC INST connector and transfers INST tokens
        _targetNames[0] = "BASIC-A";
        _datas[0] = abi.encodeWithSignature(
            "withdraw(address,uint256,address,uint256,uint256)",
            INST_TOKEN_ADDR,
            type(uint).max,
            _inputData.to,
            0,
            0
        );
        
        // connects dsaAccount with MAKER INST connector and transfers ownership of the vault
        _targetNames[1] = "MAKERDAO-A";
        _datas[1] = abi.encodeWithSignature(
            "transfer(uint256,address)",
            _inputData.vaultId,
            address(this)
        );

        return abi.encodeWithSignature("cast(string[],bytes[],address)", _targetNames, _datas, _origin);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
