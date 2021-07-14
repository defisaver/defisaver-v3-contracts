// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/insta/IInstaIndex.sol";
import "../../interfaces/insta/IInstaMakerDAOMerkleDistributor.sol";
import "../../interfaces/mcd/IManager.sol";

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
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        _claimInst(inputData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _claimInst(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _claimInst(Params memory _inputData) internal {
        address dsaAddress = instaAccountBuilder.build(address(this), 2, address(0));

        mcdManager.give(_inputData.vaultId, dsaAddress);

        rewardDistributor.claim(
            _inputData.index,
            _inputData.vaultId,
            dsaAddress,
            0x9cCf93089cb14F94BAeB8822F8CeFfd91Bd71649,
            _inputData.rewardAmount,
            _inputData.networthAmount,
            _inputData.merkleProof
        );
        address INST_TOKEN = 0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb;

        string[] memory _targetNames = new string[](2);
        bytes[] memory _datas = new bytes[](2);
        address _origin = address(this);

        _targetNames[0] = "BASIC-A";
        _datas[0] = abi.encodeWithSignature(
            "withdraw(address,uint256,address,uint256,uint256)",
            INST_TOKEN_ADDR,
            type(uint).max,
            _inputData.to,
            0,
            0
        );
        
        _targetNames[1] = "MAKERDAO-A";
        _datas[1] = abi.encodeWithSignature(
            "transfer(uint256,address)",
            _inputData.vaultId,
            address(this)
        );
        
        (bool success, bytes memory data) =
            dsaAddress.call(abi.encodeWithSignature("cast(string[],bytes[],address)", _targetNames, _datas, _origin));
        require(success);
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
