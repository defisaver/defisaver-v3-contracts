// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../interfaces/compound/IComptroller.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/compound/ICToken.sol";
import "../utils/Exponential.sol";

contract CompRewardView is Exponential {
    address public constant COMP_ADDR = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    IComptroller public constant comp = IComptroller(COMPTROLLER_ADDR);

    uint224 public constant compInitialIndex = 1e36;

    function getBalance(address _user, address[] memory _cTokens) public view returns (uint256) {
        uint256 compBalance = 0;

        for (uint256 i = 0; i < _cTokens.length; ++i) {
            compBalance += getSupplyBalance(_cTokens[i], _user);
            compBalance += getBorrowBalance(_cTokens[i], _user);
        }

        compBalance = add_(IComptroller(COMPTROLLER_ADDR).compAccrued(_user), compBalance);

        compBalance += IERC20(COMP_ADDR).balanceOf(_user);

        return compBalance;
    }

    function getClaimableAssets(address[] memory _cTokens, address _user)
        public
        view
        returns (bool[] memory supplyClaims, bool[] memory borrowClaims)
    {
        supplyClaims = new bool[](_cTokens.length);
        borrowClaims = new bool[](_cTokens.length);

        for (uint256 i = 0; i < _cTokens.length; ++i) {
            supplyClaims[i] = getSupplyBalance(_cTokens[i], _user) > 0;
            borrowClaims[i] = getBorrowBalance(_cTokens[i], _user) > 0;
        }
    }

    function getSupplyBalance(address _cToken, address _supplier)
        public
        view
        returns (uint256 supplierAccrued)
    {
        IComptroller.CompMarketState memory supplyState = comp.compSupplyState(_cToken);
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({
            mantissa: comp.compSupplierIndex(_cToken, _supplier)
        });

        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = compInitialIndex;
        }

        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint256 supplierTokens = ICToken(_cToken).balanceOf(_supplier);
        uint256 supplierDelta = mul_(supplierTokens, deltaIndex);
        supplierAccrued = supplierDelta;
    }

    function getBorrowBalance(address _cToken, address _borrower)
        public
        view
        returns (uint256 borrowerAccrued)
    {
        IComptroller.CompMarketState memory borrowState = comp.compBorrowState(_cToken);
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({
            mantissa: comp.compBorrowerIndex(_cToken, _borrower)
        });

        Exp memory marketBorrowIndex = Exp({mantissa: ICToken(_cToken).borrowIndex()});

        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint256 borrowerAmount = div_(
                ICToken(_cToken).borrowBalanceStored(_borrower),
                marketBorrowIndex
            );
            uint256 borrowerDelta = mul_(borrowerAmount, deltaIndex);
            borrowerAccrued = borrowerDelta;
        }
    }
}