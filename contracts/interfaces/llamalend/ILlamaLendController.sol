// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface ILlamaLendController {
    function create_loan(uint256 _collateralAmount, uint256 _debtAmount, uint256 _nBands) external payable;
    function create_loan_extended(uint256 _collateralAmount, uint256 _debtAmount, uint256 _nBands, address _callbacker, uint256[] memory _callbackArgs) external payable;

    /// @dev all functions below: if _collateralAmount is 0 will just return
    function add_collateral(uint256 _collateralAmount) external payable;
    function add_collateral(uint256 _collateralAmount, address _for) external payable;

    function remove_collateral(uint256 _collateralAmount) external;
    /// @param _useEth relevant only for ETH collateral pools (currently not deployed)
    function remove_collateral(uint256 _collateralAmount, bool _useEth) external;

    /// @dev all functions below: if _debtAmount is 0 will just return
    function borrow_more(uint256 _collateralAmount, uint256 _debtAmount) external payable;

    /// @dev if _debtAmount > debt will do full repay
    function repay(uint256 _debtAmount) external payable;
    function repay(uint256 _debtAmount, address _for) external payable;
    /// @param _maxActiveBand Don't allow active band to be higher than this (to prevent front-running the repay)
    function repay(uint256 _debtAmount, address _for, int256 _maxActiveBand) external payable;
    function repay(uint256 _debtAmount, address _for, int256 _maxActiveBand, bool _useEth) external payable;
    function repay_extended(address _callbacker, uint256[] memory _callbackArgs) external;

    function liquidate(address user, uint256 min_x) external;
    function liquidate(address user, uint256 min_x, bool _useEth) external;
    function liquidate_extended(address user, uint256 min_x, uint256 frac, bool use_eth, address callbacker, uint256[] memory _callbackArgs) external;


    /// GETTERS
    function amm() external view returns (address);
    function monetary_policy() external view returns (address);
    function collateral_token() external view returns (address);
    function borrowed_token() external view returns (address);
    function debt(address) external view returns (uint256);
    function total_debt() external view returns (uint256);
    function health_calculator(address, int256, int256, bool, uint256) external view returns (int256);
    function health_calculator(address, int256, int256, bool) external view returns (int256);
    function health(address) external view returns (int256);
    function health(address, bool) external view returns (int256);
    function max_borrowable(uint256 collateralAmount, uint256 nBands) external view returns (uint256);
    function min_collateral(uint256 debtAmount, uint256 nBands) external view returns (uint256);
    function calculate_debt_n1(uint256, uint256, uint256) external view returns (int256);
    function minted() external view returns (uint256);
    function redeemed() external view returns (uint256);
    function amm_price() external view returns (uint256);
    function user_state(address) external view returns (uint256[4] memory);
    function user_prices(address) external view returns (uint256[2] memory);
    function loan_exists(address) external view returns (bool);
    function liquidation_discount() external view returns (uint256);
    function factory() external view returns (address);
}