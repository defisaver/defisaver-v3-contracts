// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DSMath } from "../DS/DSMath.sol";
import { IGetSafes } from "../interfaces/protocols/reflexer/IGetSafes.sol";
import { ISAFEEngine } from "../interfaces/protocols/reflexer/ISAFEEngine.sol";
import { ISAFEManager } from "../interfaces/protocols/reflexer/ISAFEManager.sol";
import { IOracleRelayer } from "../interfaces/protocols/reflexer/IOracleRelayer.sol";
import { IMedianOracle } from "../interfaces/protocols/reflexer/IMedianOracle.sol";
import { ITaxCollector } from "../interfaces/protocols/reflexer/ITaxCollector.sol";

contract ReflexerView is DSMath {
    // mainnet
    address public constant GET_SAFES_ADDR = 0xdf4BC9aA98cC8eCd90Ba2BEe73aD4a1a9C8d202B;
    address public constant MANAGER_ADDR = 0xEfe0B4cA532769a3AE758fD82E1426a03A94F185;
    address public constant SAFE_ENGINE_ADDRESS = 0xCC88a9d330da1133Df3A7bD823B95e52511A6962;
    address public constant ORACLE_RELAYER_ADDRESS = 0x4ed9C0dCa0479bC64d8f4EB3007126D5791f7851;
    address public constant MEDIAN_ORACLE_ADDRESS = 0xcbE170458B8e69147100504D26FFc8f02c1B862F;
    address public constant TAX_COLLECTOR_ADDRESS = 0xcDB05aEda142a1B0D6044C09C64e4226c1a281EB;

    struct SafeInfo {
        uint256 safeId;
        uint256 coll;
        uint256 debt;
        address safeAddr;
        bytes32 collType;
    }

    struct CollInfo {
        uint256 debtCeiling;
        uint256 currDebtAmount;
        uint256 currRate;
        uint256 dust;
        uint256 safetyPrice;
        uint256 liqPrice;
        uint256 assetPrice;
        uint256 liqRatio;
        uint256 stabilityFee;
    }

    struct RaiInfo {
        uint256 redemptionPrice;
        uint256 currRaiPrice;
        uint256 redemptionRate;
    }

    function getCollateralTypeInfo(bytes32 _collType) public returns (CollInfo memory collInfo) {
        (
            uint256 debtAmount,
            uint256 accumulatedRates,
            uint256 safetyPrice,
            uint256 debtCeiling,
            uint256 debtFloor,
            uint256 liquidationPrice
        ) = ISAFEEngine(SAFE_ENGINE_ADDRESS).collateralTypes(_collType);

        (, uint256 liqRatio) = IOracleRelayer(ORACLE_RELAYER_ADDRESS).collateralTypes(_collType);

        (uint256 stabilityFee,) = ITaxCollector(TAX_COLLECTOR_ADDRESS).collateralTypes(_collType);

        collInfo = CollInfo({
            debtCeiling: debtCeiling,
            currDebtAmount: debtAmount,
            currRate: accumulatedRates,
            dust: debtFloor,
            safetyPrice: safetyPrice,
            liqPrice: liquidationPrice,
            assetPrice: getPrice(_collType),
            liqRatio: liqRatio,
            stabilityFee: stabilityFee
        });
    }

    function getCollAndRaiInfo(bytes32 _collType) public returns (CollInfo memory collInfo, RaiInfo memory raiInfo) {
        collInfo = getCollateralTypeInfo(_collType);
        raiInfo = getRaiInfo();
    }

    function getPrice(bytes32 _collType) public returns (uint256) {
        (, uint256 safetyCRatio) = IOracleRelayer(ORACLE_RELAYER_ADDRESS).collateralTypes(_collType);
        (,, uint256 safetyPrice,,,) = ISAFEEngine(SAFE_ENGINE_ADDRESS).collateralTypes(_collType);

        uint256 redemptionPrice = IOracleRelayer(ORACLE_RELAYER_ADDRESS).redemptionPrice();

        return rmul(rmul(safetyPrice, redemptionPrice), safetyCRatio);
    }

    function getRaiInfo() public returns (RaiInfo memory raiInfo) {
        uint256 medianPrice = 0;

        try IMedianOracle(MEDIAN_ORACLE_ADDRESS).read() returns (uint256 p) {
            medianPrice = p;
        } catch (bytes memory) { }

        raiInfo = RaiInfo({
            redemptionPrice: IOracleRelayer(ORACLE_RELAYER_ADDRESS).redemptionPrice(),
            currRaiPrice: IMedianOracle(MEDIAN_ORACLE_ADDRESS).read(),
            redemptionRate: IOracleRelayer(ORACLE_RELAYER_ADDRESS).redemptionRate()
        });
    }

    function getSafeInfo(uint256 _safeId) public view returns (SafeInfo memory safeInfo) {
        address safeAddr = ISAFEManager(MANAGER_ADDR).safes(_safeId);
        bytes32 collType = ISAFEManager(MANAGER_ADDR).collateralTypes(_safeId);

        (uint256 coll, uint256 debt) = ISAFEEngine(SAFE_ENGINE_ADDRESS).safes(collType, safeAddr);

        safeInfo = SafeInfo({ safeId: _safeId, coll: coll, debt: debt, safeAddr: safeAddr, collType: collType });
    }

    function getUserSafes(address _user)
        public
        view
        returns (uint256[] memory ids, address[] memory safes, bytes32[] memory collateralTypes)
    {
        return IGetSafes(GET_SAFES_ADDR).getSafesAsc(MANAGER_ADDR, _user);
    }

    function getUserSafesFullInfo(address _user) public view returns (SafeInfo[] memory safeInfos) {
        (uint256[] memory ids,,) = getUserSafes(_user);

        safeInfos = new SafeInfo[](ids.length);

        for (uint256 i = 0; i < ids.length; ++i) {
            safeInfos[i] = getSafeInfo(ids[i]);
        }
    }

    function getFullInfo(address _user, bytes32 _collType)
        public
        returns (CollInfo memory collInfo, RaiInfo memory raiInfo, SafeInfo[] memory safeInfos)
    {
        collInfo = getCollateralTypeInfo(_collType);
        raiInfo = getRaiInfo();
        safeInfos = getUserSafesFullInfo(_user);
    }
}
