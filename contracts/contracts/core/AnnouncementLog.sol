// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRoleManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function PROFESSOR_ROLE() external view returns (bytes32);
}

/// @title AnnouncementLog
/// @notice Professors publish announcements by hash only (never raw content).
contract AnnouncementLog {
    struct Announcement {
        uint256 id;
        bytes32 contentHash;
        string category;
        string targetGroup; // empty string => public to all students
        uint64 timestamp;
        address publisher;
    }

    IRoleManager public immutable roleManager;

    uint256 private _nextId = 1;
    mapping(uint256 => Announcement) private _announcements;

    event AnnouncementPublished(
        uint256 indexed id,
        bytes32 indexed contentHash,
        address indexed publisher,
        string category,
        string targetGroup,
        uint256 timestamp
    );

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "AnnouncementLog: roleManager is zero");
        roleManager = IRoleManager(roleManagerAddress);
    }

    /// @notice Publish a new announcement (hash only).
    function publishAnnouncement(
        bytes32 contentHash,
        string calldata category,
        string calldata targetGroup
    ) external returns (uint256 id) {
        require(contentHash != bytes32(0), "AnnouncementLog: empty hash");
        require(bytes(category).length != 0, "AnnouncementLog: empty category");
        require(
            roleManager.hasRole(roleManager.PROFESSOR_ROLE(), msg.sender),
            "AnnouncementLog: professor only"
        );

        id = _nextId++;
        uint64 ts = uint64(block.timestamp);

        _announcements[id] = Announcement({
            id: id,
            contentHash: contentHash,
            category: category,
            targetGroup: targetGroup,
            timestamp: ts,
            publisher: msg.sender
        });

        emit AnnouncementPublished(id, contentHash, msg.sender, category, targetGroup, ts);
    }

    /// @notice True if an announcement ID exists.
    function announcementExists(uint256 id) external view returns (bool) {
        return _announcements[id].publisher != address(0);
    }

    /// @notice Read announcement fields without returning the struct.
    function getAnnouncement(
        uint256 id
    )
        external
        view
        returns (
            bytes32 contentHash,
            string memory category,
            string memory targetGroup,
            uint256 timestamp,
            address publisher
        )
    {
        Announcement storage a = _announcements[id];
        require(a.publisher != address(0), "AnnouncementLog: not found");
        return (a.contentHash, a.category, a.targetGroup, a.timestamp, a.publisher);
    }
}

