// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IDaiJoin.sol";

import "../../utils/ReentrancyGuard.sol";
import "../../utils/TokenUtils.sol";
import "../../core/strategy/StrategyModel.sol";

import "./helpers/McdHelper.sol";
import "../balancer/helpers/MainnetBalancerV2Addresses.sol";

contract McdRepayComposite is
ActionBase, DFSSell, McdHelper, IFlashLoanRecipient,
ReentrancyGuard, MainnetBalancerV2Addresses {
    using TokenUtils for address;

    address internal immutable ACTION_ADDR = address(this);

    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be payed back
    /// @param _from Where the Dai is pulled from
    /// @param _mcdManager The manager address we are using
    struct RepayParams {
        uint256 vaultId;
        uint256 repayAmount;
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
        RepayParams memory repayParams = _parseCompositParams(_callData);

        repayParams.vaultId = _parseParamUint(
            repayParams.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        repayParams.repayAmount = _parseParamUint(
            repayParams.repayAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        repayParams.mcdManager = _parseParamAddr(
            repayParams.mcdManager,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        repayParams.joinAddr = _parseParamAddr(
            repayParams.joinAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );

        repayParams.exchangeData.srcAddr = _parseParamAddr(
            repayParams.exchangeData.srcAddr,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        repayParams.exchangeData.destAddr = _parseParamAddr(
            repayParams.exchangeData.destAddr,
            _paramMapping[5],
            _subData,
            _returnValues
        );

        repayParams.exchangeData.srcAmount = _parseParamUint(
            repayParams.exchangeData.srcAmount,
            _paramMapping[6],
            _subData,
            _returnValues
        );

        _flBalancer(repayParams);
    }

    /// @notice Parses inputs and runs the single implemented action through a proxy
    /// @dev Used to save gas when executing a single action directly
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell) {
        RepayParams memory repayParams = _parseCompositParams(_callData);
        _flBalancer(repayParams);
    }

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    function _flBalancer(RepayParams memory _repayParams) internal {
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = _repayParams.exchangeData.srcAddr;
        amounts[0] = _repayParams.repayAmount;

        IManager(_repayParams.mcdManager).cdpAllow(_repayParams.vaultId, ACTION_ADDR, 1);

        IFlashLoans(VAULT_ADDR).flashLoan(
            ACTION_ADDR,
            tokens,
            amounts,
            abi.encode(_repayParams, address(this))
        );

        IManager(_repayParams.mcdManager).cdpAllow(_repayParams.vaultId, ACTION_ADDR, 0);
    }

    /// @notice Balancer FL callback function that formats and calls back this Action contract
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (RepayParams memory repayParams, address proxy) = abi.decode(_userData, (RepayParams, address));

        _repay(proxy, repayParams);

        uint256 flPaybackAmount = _amounts[0] + _feeAmounts[0];
        _tokens[0].withdrawTokens(address(VAULT_ADDR), flPaybackAmount);
    }

    function _repay(address _proxy, RepayParams memory _repayParams) internal {
        uint256 collateral = getAllColl(IManager(_repayParams.mcdManager), _repayParams.joinAddr, _repayParams.vaultId);
        _repayParams.repayAmount = _repayParams.repayAmount > collateral ? collateral : _repayParams.repayAmount;

        // Sell flashloaned collateral asset for debt asset
        assert(_repayParams.exchangeData.srcAmount == _repayParams.repayAmount); // CONSIDER
        assert(_repayParams.exchangeData.destAddr == DAI_ADDR); // CONSIDER
        (uint256 exchangedAmount, ) = _dfsSell(_repayParams.exchangeData, address(this), address(this), false);

        (address urn, bytes32 ilk) = getUrnAndIlk(_repayParams.mcdManager, _repayParams.vaultId);
        uint256 paybackAmount = exchangedAmount;
        // if paybackAmount is higher than current debt, repay all debt and send remaining dai to proxy
        {
            uint256 debt = getAllDebt(address(vat), urn, urn, ilk);
            if (exchangedAmount > debt) {
                DAI_ADDR.withdrawTokens(IDSProxy(_proxy).owner(), exchangedAmount - debt);
                paybackAmount = debt;
            }
        }
        DAI_ADDR.approveToken(DAI_JOIN_ADDR, paybackAmount);

        {
            address joinToken = _repayParams.exchangeData.srcAddr;
            uint256 collateralAssetBalanceDelta = joinToken.getBalance(address(this));

            if (_repayParams.mcdManager == CROPPER) {
                _cropperRepay(
                    _repayParams.vaultId,
                    urn,
                    ilk,
                    _repayParams.joinAddr,
                    paybackAmount,
                    _repayParams.repayAmount
                );
            } else {
                _mcdManagerRepay(
                    _repayParams.mcdManager,
                    _repayParams.vaultId,
                    urn,
                    ilk,
                    _repayParams.joinAddr,
                    paybackAmount,
                    _repayParams.repayAmount
                );
            }
            collateralAssetBalanceDelta = joinToken.getBalance(address(this)) - collateralAssetBalanceDelta;
            require(collateralAssetBalanceDelta == _repayParams.repayAmount);
        }

        logger.logRecipeEvent("McdRepayComposite");
        emit ActionEvent("", abi.encode(
            _proxy,
            _repayParams.repayAmount,
            exchangedAmount,
            paybackAmount
        ));
    }

    function _mcdManagerRepay(
        address _mcdManager,
        uint256 _vaultId,
        address _urn,
        bytes32 _ilk,
        address _joinAddr,
        uint256 _paybackAmount,
        uint256 _withdrawAmount
    ) internal {
        IDaiJoin(DAI_JOIN_ADDR).join(_urn, _paybackAmount);
        uint256 daiVatBalance = vat.dai(_urn);
        int256 paybackAmountNormalized = normalizePaybackAmount(address(vat), daiVatBalance, _urn, _ilk);
        uint256 frobAmount = convertTo18(_joinAddr, _withdrawAmount);

        IManager(_mcdManager).frob(
            _vaultId,
            -toPositiveInt(frobAmount),
            paybackAmountNormalized
        );
        IManager(_mcdManager).flux(_vaultId, address(this), frobAmount);
        // withdraw the tokens from Join
        IJoin(_joinAddr).exit(address(this), _withdrawAmount);
    }

    function _cropperRepay(
        uint256 _vaultId,
        address _urn,
        bytes32 _ilk,
        address _joinAddr,
        uint256 _paybackAmount,
        uint256 _withdrawAmount
    ) internal {
        address cdpOwner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
        IDaiJoin(DAI_JOIN_ADDR).join(cdpOwner, _paybackAmount);
        uint256 daiVatBalance = vat.dai(_urn);
        int256 paybackAmountNormalized = normalizePaybackAmount(address(vat), daiVatBalance, _urn, _ilk);
        uint256 frobAmount = convertTo18(_joinAddr, _withdrawAmount);

        vat.hope(CROPPER);
        {
            ICropper(CROPPER).frob(
                _ilk,
                cdpOwner,
                cdpOwner,
                cdpOwner,
                -toPositiveInt(frobAmount),
                paybackAmountNormalized
            );
        }
        vat.nope(CROPPER);
        // withdraw the tokens from Cropper
        ICropper(CROPPER).exit(_joinAddr, address(this), _withdrawAmount);
    }

    /// @notice Returns the type of action we are implementing
    function actionType()
    public
    pure
    virtual override (ActionBase, DFSSell)
    returns (uint8) {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function _parseCompositParams(bytes memory _calldata) internal pure returns (RepayParams memory params) {
        params = abi.decode(_calldata, (RepayParams));
    }

    /// @dev workaround for dfsSell expecting context to be proxy
    function owner() external pure returns (address) {
        return address(0);
    }
}