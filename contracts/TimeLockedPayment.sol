// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ==========================================
// 1. SMART CONTRACT VÍ CON (ScheduledPaymentWallet)
// ==========================================
contract ScheduledPaymentWallet {
    address public sender;              // Người gửi tiền / Chủ ví
    address payable public beneficiary; // Người nhận tiền
    uint256 public unlockTime;          // Mốc thời gian mở khóa thanh toán
    bool public isWithdrawn;            // Trạng thái kiểm tra đã rút tiền hay chưa

    // Sự kiện kích hoạt khi người nhận rút tiền thành công
    event Withdrawn(address indexed beneficiary, uint256 amount);

    // Hàm khởi tạo nhận tiền trực tiếp từ Factory khi vừa giải phóng (payable)
    constructor(address _sender, address payable _beneficiary, uint256 _duration) payable {
        sender = _sender;
        beneficiary = _beneficiary;
        unlockTime = block.timestamp + _duration; // Thời gian hiện tại + số giây khóa
    }

    // Hàm Rút tiền thiết lập rào chắn bảo mật tuyệt đối
    function withdraw() public {
        // Điều kiện 1: Đúng người nhận chỉ định
        require(msg.sender == beneficiary, "Only beneficiary can withdraw");
        
        // Điều kiện 2: Đã đến hoặc vượt qua thời gian mở khóa
        require(block.timestamp >= unlockTime, "Not unlock time yet!");
        
        // Điều kiện 3: Chưa từng rút tiền trước đó
        require(!isWithdrawn, "Already withdrawn");

        uint256 amount = address(this).balance;
        require(amount > 0, "Wallet balance is zero");

        // Cập nhật trạng thái trước khi chuyển tiền để tránh lỗi Reentrancy (Tấn công gửi lại)
        isWithdrawn = true;

        // Chuyển toàn bộ tiền về ví người nhận
        beneficiary.transfer(amount);

        // Kích hoạt Event để Frontend lưu lại lịch sử
        emit Withdrawn(beneficiary, amount);
    }

    // Hàm helper giúp Frontend dễ dàng kiểm tra số dư hiện tại của ví con này
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

// ==========================================
// 2. SMART CONTRACT NHÀ MÁY QUẢN LÝ VÍ (PaymentFactory)
// ==========================================
contract PaymentFactory {
    address[] public allWallets; // Mảng lưu toàn bộ ví được tạo trên hệ thống
    
    // Ánh xạ giúp tra cứu nhanh: Địa chỉ người gửi => Danh sách các ví con họ đã tạo
    mapping(address => address[]) public walletsBySender;

    // Sự kiện kích hoạt khi một ví thanh toán mới được tạo và khóa tiền thành công
    event WalletCreated(address indexed walletAddress, address indexed sender, address indexed beneficiary, uint256 amount);

    // Hàm Tạo lịch thanh toán nhận luôn ETH (payable)
    function createScheduledPayment(address payable _beneficiary, uint256 _duration) public payable {
        require(msg.value > 0, "Must send some ETH to lock");
        require(_beneficiary != address(0), "Invalid beneficiary address");

        // Dùng từ khóa 'new', vừa tạo ví con vừa ném thẳng lượng ETH nhận được vào constructor của nó
        ScheduledPaymentWallet newWallet = (new ScheduledPaymentWallet){value: msg.value}(
            msg.sender, 
            _beneficiary, 
            _duration
        );

        address walletAddress = address(newWallet);

        // Lưu thông tin vào bộ nhớ dữ liệu toàn cục
        allWallets.push(walletAddress);
        walletsBySender[msg.sender].push(walletAddress);

        // Kích hoạt Event để Frontend bắt được mã tx.hash
        emit WalletCreated(walletAddress, msg.sender, _beneficiary, msg.value);
    }

    // Hàm bổ sung giúp Frontend lấy nhanh toàn bộ danh sách ví của một người gửi cụ thể
    function getWalletsBySender(address _sender) public view returns (address[] memory) {
        return walletsBySender[_sender];
    }
}
