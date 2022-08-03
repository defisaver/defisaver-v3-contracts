// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";

import "../../utils/ReentrancyGuard.sol";
import "../../utils/TokenUtils.sol";
import "../../core/strategy/StrategyModel.sol";

import "./helpers/McdHelper.sol";
import "../balancer/helpers/MainnetBalancerV2Addresses.sol";

contract McdBoostComposite is
ActionBase, DFSSell, McdHelper, IFlashLoanRecipient,
ReentrancyGuard, MainnetBalancerV2Addresses {
    using TokenUtils for address;

    address internal immutable ACTION_ADDR = address(this);

    /// @param vaultId Id of the vault
    /// @param mcdManager The manager address we are using
    /// @param joinAddr Collateral join address
    /// @param exchangeData Data needed for swap
    struct BoostParams {
        uint256 vaultId;
        address mcdManager;
        address joinAddr;
        ExchangeData exchangeData;
    }

    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override (ActionBase, DFSSell) returns (bytes32) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);

        boostParams.vaultId = _parseParamUint(
            boostParams.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        boostParams.mcdManager = _parseParamAddr(
            boostParams.mcdManager,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        boostParams.joinAddr = _parseParamAddr(
            boostParams.joinAddr,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAddr = _parseParamAddr(
            boostParams.exchangeData.srcAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        boostParams.exchangeData.destAddr = _parseParamAddr(
            boostParams.exchangeData.destAddr,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAmount = _parseParamUint(
            boostParams.exchangeData.srcAmount,
            _paramMapping[5],
            _subData,
            _returnValues
        );

        _flBalancer(boostParams);
    }

    /// @notice Parses inputs and runs the single implemented action through a proxy
    /// @dev Used to save gas when executing a single action directly
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);
        _flBalancer(boostParams);
    }

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    function _flBalancer(BoostParams memory _boostParams) internal {
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        assert(_boostParams.exchangeData.srcAddr == DAI_ADDR);
        tokens[0] = _boostParams.exchangeData.srcAddr;
        amounts[0] = _boostParams.exchangeData.srcAmount;

        IManager(_boostParams.mcdManager).cdpAllow(_boostParams.vaultId, ACTION_ADDR, 1);
        IFlashLoans(VAULT_ADDR).flashLoan(
            ACTION_ADDR,
            tokens,
            amounts,
            abi.encode(_boostParams, address(this))
        );
        IManager(_boostParams.mcdManager).cdpAllow(_boostParams.vaultId, ACTION_ADDR, 0);
    }

    /// @notice Balancer FL callback function that formats and calls back RecipeExecutor
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (BoostParams memory boostParams, address proxy) = abi.decode(_userData, (BoostParams, address));

        _boost(proxy, boostParams);
        uint256 flPaybackAmount = _amounts[0] + _feeAmounts[0];
        _tokens[0].withdrawTokens(address(VAULT_ADDR), flPaybackAmount);
    }

    function _boost(address _proxy, BoostParams memory _boostParams) internal {
        address collateralAsset = _boostParams.exchangeData.destAddr;
        uint256 boostAmount = _boostParams.exchangeData.srcAmount;

        // Sell flashloaned debt asset for collateral asset
        (uint256 supplyAmount, ) = _dfsSell(_boostParams.exchangeData, address(this), address(this), false);

        (address urn, bytes32 ilk) = getUrnAndIlk(_boostParams.mcdManager, _boostParams.vaultId);
        uint256 rate = IJug(JUG_ADDRESS).drip(ilk);
        uint256 daiVatBalance = vat.dai(urn);
        int256 vatSupplyAmount = toPositiveInt(convertTo18(_boostParams.joinAddr, supplyAmount));
        int256 drawAmountNormalized = normalizeDrawAmount(boostAmount, rate, daiVatBalance);

        if (_boostParams.mcdManager == CROPPER) {
            _cropperBoost(
                collateralAsset,
                _boostParams.joinAddr,
                _boostParams.vaultId,
                supplyAmount,
                vatSupplyAmount,
                drawAmountNormalized,
                ilk
            );
        } else {
            _mcdManagerBoost(
                _boostParams.mcdManager,
                collateralAsset,
                _boostParams.joinAddr,
                _boostParams.vaultId,
                supplyAmount,
                vatSupplyAmount,
                boostAmount,
                drawAmountNormalized,
                urn
            );
        }

        vat.hope(DAI_JOIN_ADDR);
        IDaiJoin(DAI_JOIN_ADDR).exit(address(this), boostAmount);
        vat.nope(DAI_JOIN_ADDR);

        logger.logRecipeEvent("McdBoostComposite");
        emit ActionEvent("McdBoostComposite", abi.encode(
            _proxy,
            boostAmount,
            supplyAmount
        ));
    }

    function _mcdManagerBoost(
       address _mcdManager,
       address _collateralAsset,
       address _joinAddr,
       uint256 _vaultId,
       uint256 _supplyAmount,
       int256 _vatSupplyAmount,
       uint256 _drawAmount,
       int256 _drawAmountNormalized,
       address _urn
    ) internal {
        _collateralAsset.approveToken(_joinAddr, _supplyAmount);
        IJoin(_joinAddr).join(_urn, _supplyAmount);
        IManager(_mcdManager).frob(
            _vaultId,
            _vatSupplyAmount,
            _drawAmountNormalized
        );
        IManager(_mcdManager).move(_vaultId, address(this), toRad(_drawAmount));
    }

    function _cropperBoost(
        address _joinAddr,
        address _collateralAsset,
        uint256 _vaultId,
        uint256 _supplyAmount,
        int256 _vatSupplyAmount,
        int256 _drawAmountNormalized,
        bytes32 _ilk
    ) internal {
        address cdpOwner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);

        _collateralAsset.approveToken(CROPPER, _supplyAmount);
        ICropper(CROPPER).join(_joinAddr, cdpOwner, _supplyAmount);
        ICropper(CROPPER).frob(
            _ilk,
            cdpOwner,
            cdpOwner,
            cdpOwner,
            _vatSupplyAmount,
            _drawAmountNormalized
        );
    }

    /// @notice Returns the type of action we are implementing
    function actionType()
    public
    pure
    virtual override (ActionBase, DFSSell)
    returns (uint8) {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function _parseCompositeParams(bytes memory _calldata) internal pure returns (BoostParams memory params) {
        params = abi.decode(_calldata, (BoostParams));
    }

    /// @dev workaround for dfsSell expecting context to be proxy
    function owner() external pure returns (address) {
        return address(0);
    }
}