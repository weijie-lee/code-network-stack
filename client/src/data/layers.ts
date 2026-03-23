export interface PacketField {
  name: string;
  bits: number;
  description: string;
  color: string;
  value?: string;
}

export interface CodeExample {
  title: string;
  language: string;
  code: string;
  description: string;
}

export interface ExperimentStep {
  step: number;
  title: string;
  command?: string;
  description: string;
  expectedOutput?: string;
}

export interface LayerData {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  glowColor: string;
  icon: string;
  level: number;
  protocols: string[];
  overview: string;
  keyPoints: string[];
  packetFields: PacketField[];
  codeExamples: CodeExample[];
  experiments: ExperimentStep[];
  rfcs: { number: string; title: string; url: string }[];
}

export const layers: LayerData[] = [
  {
    id: "link",
    name: "数据链路层",
    subtitle: "Ethernet & ARP",
    color: "#ff6b6b",
    glowColor: "rgba(255, 107, 107, 0.4)",
    icon: "🔗",
    level: 1,
    protocols: ["Ethernet II", "ARP", "RARP", "802.3"],
    overview:
      "数据链路层负责在相邻节点之间可靠地传输数据帧。以太网（Ethernet）是局域网中最主流的链路层协议，而 ARP（地址解析协议）则负责将 IP 地址动态映射为 MAC 地址，是网络通信的基础桥梁。",
    keyPoints: [
      "以太网帧头部固定 14 字节：目的 MAC (6B) + 源 MAC (6B) + EtherType (2B)",
      "EtherType ≥ 0x0600 表示载荷协议类型，0x0800=IPv4，0x0806=ARP",
      "ARP 通过广播请求获取目标 IP 对应的 MAC 地址，结果缓存在 ARP 表中",
      "Linux 下可通过 TUN/TAP 虚拟设备在用户态拦截和注入二层流量",
      "__attribute__((packed)) 防止编译器字节对齐填充，确保结构体与协议格式完全一致",
    ],
    packetFields: [
      { name: "Dst MAC", bits: 48, description: "目的 MAC 地址（6 字节）", color: "#ff6b6b", value: "ff:ff:ff:ff:ff:ff" },
      { name: "Src MAC", bits: 48, description: "源 MAC 地址（6 字节）", color: "#ff9f43", value: "aa:bb:cc:dd:ee:ff" },
      { name: "EtherType", bits: 16, description: "载荷协议类型（0x0806=ARP）", color: "#ffd32a", value: "0x0806" },
      { name: "Payload", bits: 368, description: "载荷数据（ARP 或 IPv4 数据包）", color: "#4a4a6a", value: "..." },
    ],
    codeExamples: [
      {
        title: "以太网帧头部结构体定义",
        language: "c",
        description: "使用 packed 属性确保结构体与以太网帧格式完全对齐，通过类型转换直接解析原始字节流。",
        code: `#include <stdint.h>
#include <linux/if_ether.h>

/* 以太网帧头部 - 14 字节
 * __attribute__((packed)) 防止编译器插入填充字节
 * 使结构体内存布局与协议格式完全一致 */
struct eth_hdr {
    uint8_t  dmac[6];     /* 目的 MAC 地址 */
    uint8_t  smac[6];     /* 源 MAC 地址   */
    uint16_t ethertype;   /* 载荷协议类型  */
    uint8_t  payload[];   /* 灵活数组成员  */
} __attribute__((packed));

/* 直接将字节缓冲区强制转换为结构体指针
 * 零拷贝解析，无需手动逐字段读取 */
struct eth_hdr *parse_eth(uint8_t *buf) {
    return (struct eth_hdr *)buf;
}

/* 处理以太网帧，根据 EtherType 分发 */
void handle_frame(struct eth_hdr *hdr) {
    uint16_t type = ntohs(hdr->ethertype);
    switch (type) {
        case ETH_P_ARP:   /* 0x0806 */
            handle_arp(hdr->payload);
            break;
        case ETH_P_IP:    /* 0x0800 */
            handle_ip(hdr->payload);
            break;
        default:
            /* 未知协议，丢弃 */
            break;
    }
}`,
      },
      {
        title: "ARP 协议实现",
        language: "c",
        description: "实现 ARP 请求的解析与应答。当收到 ARP Request 且目标 IP 是本机时，构造 ARP Reply 并发送。",
        code: `/* ARP 头部结构 */
struct arp_hdr {
    uint16_t hwtype;    /* 硬件类型: 0x0001=以太网 */
    uint16_t protype;   /* 协议类型: 0x0800=IPv4  */
    uint8_t  hwsize;    /* 硬件地址长度: 6         */
    uint8_t  prosize;   /* 协议地址长度: 4         */
    uint16_t opcode;    /* 1=Request, 2=Reply     */
    uint8_t  data[];    /* 发送端/接收端地址信息  */
} __attribute__((packed));

struct arp_ipv4 {
    uint8_t  smac[6];   /* 发送端 MAC */
    uint32_t sip;       /* 发送端 IP  */
    uint8_t  dmac[6];   /* 目标 MAC   */
    uint32_t dip;       /* 目标 IP    */
} __attribute__((packed));

/* 处理 ARP 请求，发送 ARP 应答 */
void handle_arp_request(struct arp_hdr *arph, uint32_t my_ip,
                        uint8_t my_mac[6]) {
    struct arp_ipv4 *arp_data = (struct arp_ipv4 *)arph->data;

    /* 检查是否是针对本机 IP 的 ARP 请求 */
    if (ntohl(arp_data->dip) != ntohl(my_ip)) return;

    /* 构造 ARP Reply: 交换发送端和目标端信息 */
    arph->opcode = htons(2);  /* Reply */
    memcpy(arp_data->dmac, arp_data->smac, 6);
    arp_data->dip = arp_data->sip;
    memcpy(arp_data->smac, my_mac, 6);
    arp_data->sip = my_ip;

    /* 通过 TAP 设备发送应答 */
    send_eth_frame(arp_data->dmac, my_mac,
                   ETH_P_ARP, arph, sizeof(*arph) + sizeof(*arp_data));
}`,
      },
      {
        title: "TUN/TAP 设备初始化",
        language: "c",
        description: "在 Linux 用户态创建 TAP 虚拟网络设备，用于拦截和注入二层网络流量，实现用户态协议栈。",
        code: `#include <fcntl.h>
#include <sys/ioctl.h>
#include <linux/if_tun.h>
#include <net/if.h>

/* 创建 TAP 虚拟网络设备
 * TAP 设备工作在二层，可读写以太网帧
 * TUN 设备工作在三层，只处理 IP 数据包 */
int tun_alloc(char *dev) {
    struct ifreq ifr = {0};
    int fd, err;

    /* 打开 TUN/TAP 字符设备 */
    if ((fd = open("/dev/net/tun", O_RDWR)) < 0) {
        perror("Cannot open /dev/net/tun");
        return -1;
    }

    /* IFF_TAP: 二层设备（以太网帧）
     * IFF_NO_PI: 不添加额外的包信息头 */
    ifr.ifr_flags = IFF_TAP | IFF_NO_PI;
    if (*dev) strncpy(ifr.ifr_name, dev, IFNAMSIZ);

    if ((err = ioctl(fd, TUNSETIFF, &ifr)) < 0) {
        perror("ioctl TUNSETIFF failed");
        close(fd);
        return err;
    }

    strcpy(dev, ifr.ifr_name);
    return fd;  /* 返回文件描述符，用于 read/write */
}`,
      },
    ],
    experiments: [
      {
        step: 1,
        title: "创建 TAP 设备并配置 IP",
        command: "sudo ip tuntap add dev tap0 mode tap\nsudo ip addr add 10.0.0.1/24 dev tap0\nsudo ip link set tap0 up",
        description: "创建一个 TAP 虚拟网络设备，为其分配 IP 地址并启用。你的协议栈程序将绑定到这个设备上。",
      },
      {
        step: 2,
        title: "运行自定义协议栈程序",
        command: "sudo ./tcpip_stack tap0 10.0.0.4 00:0c:29:6d:50:25",
        description: "启动你的用户态 TCP/IP 协议栈，绑定到 tap0 设备，模拟一个 IP 为 10.0.0.4 的虚拟主机。",
      },
      {
        step: 3,
        title: "使用 arping 发送 ARP 请求",
        command: "arping -I tap0 10.0.0.4",
        description: "向你的虚拟主机发送 ARP 请求，验证 ARP 应答是否正确。",
        expectedOutput: "ARPING 10.0.0.4 from 10.0.0.1 tap0\nUnicast reply from 10.0.0.4 [00:0C:29:6D:50:25]  3.2ms",
      },
      {
        step: 4,
        title: "抓包验证 ARP 交互",
        command: "sudo tcpdump -i tap0 -n -e arp -v",
        description: "使用 tcpdump 监听 tap0 接口上的 ARP 流量，观察 Request 广播和 Reply 单播的完整交互过程。",
        expectedOutput: "10.0.0.1 > ff:ff:ff:ff:ff:ff, ARP Request who-has 10.0.0.4\n00:0c:29:6d:50:25 > aa:bb:cc:dd:ee:ff, ARP Reply 10.0.0.4 is-at 00:0c:29:6d:50:25",
      },
      {
        step: 5,
        title: "查看 ARP 缓存表",
        command: "arp -n\n# 或使用 ip 命令\nip neigh show",
        description: "查看系统 ARP 缓存，确认你的协议栈返回的 ARP Reply 已被系统内核记录。",
        expectedOutput: "Address         HWtype  HWaddress           Flags\n10.0.0.4        ether   00:0c:29:6d:50:25   C",
      },
    ],
    rfcs: [
      { number: "RFC 826", title: "An Ethernet Address Resolution Protocol", url: "https://tools.ietf.org/html/rfc826" },
      { number: "RFC 894", title: "A Standard for the Transmission of IP Datagrams over Ethernet Networks", url: "https://tools.ietf.org/html/rfc894" },
    ],
  },
  {
    id: "network",
    name: "网络层",
    subtitle: "IPv4 & ICMP",
    color: "#00d4ff",
    glowColor: "rgba(0, 212, 255, 0.4)",
    icon: "🌐",
    level: 2,
    protocols: ["IPv4", "ICMP", "IGMP", "ARP"],
    overview:
      "网络层负责将数据包从源主机路由到目的主机，跨越多个异构网络。IPv4 是互联网的核心协议，提供无连接的、尽力而为的数据包传输服务。ICMP 是 IPv4 的配套协议，用于传递控制消息和错误报告，ping 和 traceroute 都基于 ICMP 实现。",
    keyPoints: [
      "IPv4 头部最小 20 字节，包含版本、首部长度、TTL、协议号、源/目的 IP 等关键字段",
      "TTL（生存时间）每经过一个路由器减 1，降至 0 时丢弃并发送 ICMP Time Exceeded",
      "IP 分片：当数据包超过链路 MTU 时分片，接收端根据 ID、MF 标志和片偏移重组",
      "ICMP Echo Request/Reply（类型 8/0）是 ping 的实现基础",
      "IP 头部校验和只覆盖头部，不包含数据；TCP/UDP 校验和覆盖数据",
    ],
    packetFields: [
      { name: "Ver", bits: 4, description: "版本号（4=IPv4）", color: "#00d4ff", value: "4" },
      { name: "IHL", bits: 4, description: "首部长度（以 4 字节为单位，最小 5）", color: "#00b8d9", value: "5" },
      { name: "TOS", bits: 8, description: "服务类型（QoS 标记）", color: "#0099b3", value: "0x00" },
      { name: "Total Len", bits: 16, description: "IP 数据报总长度（字节）", color: "#007a8c", value: "0x0054" },
      { name: "ID", bits: 16, description: "分片标识符（同一数据包的分片共享此值）", color: "#00d4ff", value: "0x1234" },
      { name: "Flags+Offset", bits: 16, description: "标志位(DF/MF) + 13位片偏移", color: "#00b8d9", value: "0x4000" },
      { name: "TTL", bits: 8, description: "生存时间（每跳减 1）", color: "#0099b3", value: "64" },
      { name: "Protocol", bits: 8, description: "上层协议（1=ICMP, 6=TCP, 17=UDP）", color: "#007a8c", value: "1" },
      { name: "Checksum", bits: 16, description: "头部校验和（仅覆盖 IP 头部）", color: "#00d4ff", value: "0xb861" },
      { name: "Src IP", bits: 32, description: "源 IP 地址", color: "#00b8d9", value: "192.168.1.1" },
      { name: "Dst IP", bits: 32, description: "目的 IP 地址", color: "#0099b3", value: "10.0.0.4" },
      { name: "Payload", bits: 64, description: "上层协议数据（ICMP/TCP/UDP）", color: "#4a4a6a", value: "..." },
    ],
    codeExamples: [
      {
        title: "IPv4 头部结构体与校验和",
        language: "c",
        description: "IPv4 头部定义及互联网校验和算法（RFC 1071）。校验和是对头部所有 16 位字的反码求和再取反码。",
        code: `#include <stdint.h>
#include <arpa/inet.h>

struct iphdr {
#if __BYTE_ORDER == __LITTLE_ENDIAN
    uint8_t  ihl:4;       /* 首部长度（4字节单位）*/
    uint8_t  version:4;   /* 版本号 = 4           */
#elif __BYTE_ORDER == __BIG_ENDIAN
    uint8_t  version:4;
    uint8_t  ihl:4;
#endif
    uint8_t  tos;         /* 服务类型             */
    uint16_t tot_len;     /* 总长度               */
    uint16_t id;          /* 分片标识符           */
    uint16_t frag_off;    /* 标志位 + 片偏移      */
    uint8_t  ttl;         /* 生存时间             */
    uint8_t  protocol;    /* 上层协议号           */
    uint16_t check;       /* 头部校验和           */
    uint32_t saddr;       /* 源 IP 地址           */
    uint32_t daddr;       /* 目的 IP 地址         */
} __attribute__((packed));

/* 互联网校验和算法 (RFC 1071)
 * 对所有 16 位字求反码和，再取反码 */
uint16_t checksum(void *addr, int count) {
    uint32_t sum = 0;
    uint16_t *ptr = (uint16_t *)addr;

    while (count > 1) {
        sum += *ptr++;
        count -= 2;
    }
    /* 处理奇数字节 */
    if (count > 0)
        sum += *(uint8_t *)ptr;

    /* 折叠进位 */
    while (sum >> 16)
        sum = (sum & 0xFFFF) + (sum >> 16);

    return ~sum;  /* 取反码 */
}

/* 构造并发送 IP 数据包 */
void send_ip_packet(uint32_t src, uint32_t dst,
                    uint8_t proto, void *data, size_t len) {
    struct iphdr iph = {
        .version  = 4,
        .ihl      = 5,
        .tos      = 0,
        .tot_len  = htons(sizeof(iph) + len),
        .id       = htons(rand()),
        .frag_off = htons(0x4000),  /* DF 位 */
        .ttl      = 64,
        .protocol = proto,
        .saddr    = src,
        .daddr    = dst,
    };
    iph.check = checksum(&iph, sizeof(iph));
    /* ... 封装以太网帧并发送 */
}`,
      },
      {
        title: "ICMP Echo Reply 实现（ping 响应）",
        language: "c",
        description: "实现对 ICMP Echo Request（类型 8）的响应，构造 Echo Reply（类型 0）。这是 ping 命令的服务端逻辑。",
        code: `/* ICMP 头部结构 */
struct icmphdr {
    uint8_t  type;      /* 8=Echo Request, 0=Echo Reply */
    uint8_t  code;      /* 通常为 0                     */
    uint16_t checksum;  /* ICMP 校验和（覆盖头部+数据） */
    uint16_t id;        /* 标识符（用于匹配请求/应答）  */
    uint16_t sequence;  /* 序列号                       */
    uint8_t  data[];    /* 可选数据载荷                 */
} __attribute__((packed));

#define ICMP_ECHO_REQUEST  8
#define ICMP_ECHO_REPLY    0

/* 处理 ICMP Echo Request，发送 Echo Reply */
void handle_icmp(struct iphdr *iph, struct icmphdr *icmph,
                 size_t icmp_len) {
    if (icmph->type != ICMP_ECHO_REQUEST) return;

    /* 修改类型为 Reply，重新计算校验和 */
    icmph->type     = ICMP_ECHO_REPLY;
    icmph->checksum = 0;
    icmph->checksum = checksum(icmph, icmp_len);

    /* 构造回复 IP 头部（交换源/目的地址）*/
    uint32_t tmp = iph->saddr;
    iph->saddr   = iph->daddr;
    iph->daddr   = tmp;
    iph->ttl     = 64;
    iph->check   = 0;
    iph->check   = checksum(iph, iph->ihl * 4);

    /* 发送回复 */
    send_eth_frame(/* ... */);
}`,
      },
      {
        title: "IP 分片处理",
        language: "c",
        description: "当数据包超过 MTU 时，需要将其分片发送。接收端根据 ID、MF 标志和片偏移重组数据包。",
        code: `#define IP_MF    0x2000  /* More Fragments 标志 */
#define IP_OFFMASK 0x1FFF  /* 片偏移掩码 */

/* 检查是否为分片包 */
int is_fragment(struct iphdr *iph) {
    uint16_t frag_off = ntohs(iph->frag_off);
    return (frag_off & IP_MF) || (frag_off & IP_OFFMASK);
}

/* 发送时进行 IP 分片
 * mtu: 链路最大传输单元（通常 1500 字节）*/
void ip_fragment_send(uint32_t src, uint32_t dst,
                      uint8_t proto, void *data,
                      size_t data_len, int mtu) {
    int ip_hdr_len = 20;
    /* 每个分片的数据部分必须是 8 字节的倍数 */
    int frag_size  = (mtu - ip_hdr_len) & ~7;
    uint16_t id    = htons(rand());
    size_t offset  = 0;

    while (offset < data_len) {
        size_t chunk = data_len - offset;
        int    more  = (chunk > frag_size);
        if (more) chunk = frag_size;

        struct iphdr iph = {
            .version  = 4, .ihl = 5,
            .tot_len  = htons(ip_hdr_len + chunk),
            .id       = id,
            /* 片偏移以 8 字节为单位 */
            .frag_off = htons((more ? IP_MF : 0) |
                              ((offset / 8) & IP_OFFMASK)),
            .ttl = 64, .protocol = proto,
            .saddr = src, .daddr = dst,
        };
        iph.check = checksum(&iph, ip_hdr_len);

        /* 发送当前分片 */
        send_with_header(&iph, (uint8_t*)data + offset, chunk);
        offset += chunk;
    }
}`,
      },
    ],
    experiments: [
      {
        step: 1,
        title: "基础 ping 测试",
        command: "ping -c 4 10.0.0.4",
        description: "向你的协议栈发送 ICMP Echo Request，验证 ICMP 处理逻辑是否正确。",
        expectedOutput: "64 bytes from 10.0.0.4: icmp_seq=1 ttl=64 time=0.8 ms\n64 bytes from 10.0.0.4: icmp_seq=2 ttl=64 time=0.6 ms",
      },
      {
        step: 2,
        title: "抓包分析 ICMP 交互",
        command: "sudo tcpdump -i tap0 -n -v icmp",
        description: "捕获 ICMP 数据包，观察 Echo Request 和 Echo Reply 的头部字段，验证 TTL、ID、序列号等字段的正确性。",
        expectedOutput: "IP 10.0.0.1 > 10.0.0.4: ICMP echo request, id 1234, seq 1, length 64\nIP 10.0.0.4 > 10.0.0.1: ICMP echo reply, id 1234, seq 1, length 64",
      },
      {
        step: 3,
        title: "触发 IP 分片",
        command: "ping -s 2000 -M dont 10.0.0.4",
        description: "发送超过 MTU 的大包（-s 2000），禁用 DF 位（-M dont），强制触发 IP 分片，观察分片和重组过程。",
        expectedOutput: "64 bytes from 10.0.0.4: icmp_seq=1 ttl=64 time=1.2 ms",
      },
      {
        step: 4,
        title: "抓包分析 IP 分片",
        command: "sudo tcpdump -i tap0 -n -v 'ip[6:2] & 0x3fff != 0'",
        description: "过滤出所有带分片标志或非零片偏移的 IP 数据包，观察 ID、MF 标志和 Fragment Offset 字段。",
        expectedOutput: "IP (frag 0x1234:1480@0+) 10.0.0.1 > 10.0.0.4\nIP (frag 0x1234:548@1480) 10.0.0.1 > 10.0.0.4",
      },
      {
        step: 5,
        title: "traceroute 路径追踪",
        command: "traceroute -n 8.8.8.8",
        description: "traceroute 利用 TTL 递增发送 UDP 包，每个路由器返回 ICMP Time Exceeded，从而探测路径。观察每一跳的 RTT。",
        expectedOutput: "1  192.168.1.1  1.2 ms\n2  10.0.0.1     5.4 ms\n3  8.8.8.8      15.2 ms",
      },
    ],
    rfcs: [
      { number: "RFC 791", title: "Internet Protocol (IPv4)", url: "https://tools.ietf.org/html/rfc791" },
      { number: "RFC 792", title: "Internet Control Message Protocol (ICMP)", url: "https://tools.ietf.org/html/rfc792" },
      { number: "RFC 1071", title: "Computing the Internet Checksum", url: "https://tools.ietf.org/html/rfc1071" },
    ],
  },
  {
    id: "transport",
    name: "传输层",
    subtitle: "TCP 核心机制",
    color: "#00ff88",
    glowColor: "rgba(0, 255, 136, 0.4)",
    icon: "⚡",
    level: 3,
    protocols: ["TCP", "UDP", "SCTP"],
    overview:
      "TCP（传输控制协议）是互联网最核心的传输层协议，在不可靠的 IP 层之上提供面向连接、可靠的字节流传输。TCP 通过三次握手建立连接、滑动窗口控制流量、拥塞控制算法保护网络，以及四次挥手优雅关闭连接，是整个协议栈中设计最精妙、实现最复杂的协议。",
    keyPoints: [
      "三次握手：SYN → SYN+ACK → ACK，双方交换 ISN（初始序列号）建立连接",
      "四次挥手：FIN → ACK → FIN → ACK，TIME_WAIT 状态等待 2MSL 确保连接彻底关闭",
      "滑动窗口：发送方根据接收方通告的窗口大小控制发送速率，实现流量控制",
      "拥塞控制：慢启动 → 拥塞避免 → 快速重传 → 快速恢复（TCP Reno 算法）",
      "TCP 校验和覆盖伪头部 + TCP 头部 + 数据，端到端完整性验证",
    ],
    packetFields: [
      { name: "Src Port", bits: 16, description: "源端口号（0-65535）", color: "#00ff88", value: "54321" },
      { name: "Dst Port", bits: 16, description: "目的端口号（0-65535）", color: "#00e07a", value: "80" },
      { name: "Seq Num", bits: 32, description: "序列号：当前数据段在字节流中的位置", color: "#00c06a", value: "0x12345678" },
      { name: "Ack Num", bits: 32, description: "确认号：期望收到的下一个字节序号", color: "#00a05a", value: "0x87654321" },
      { name: "Offset", bits: 4, description: "数据偏移（头部长度，以 4 字节为单位）", color: "#00ff88", value: "5" },
      { name: "Flags", bits: 9, description: "控制标志：URG ACK PSH RST SYN FIN", color: "#00e07a", value: "SYN" },
      { name: "Window", bits: 16, description: "接收窗口大小（字节），用于流量控制", color: "#00c06a", value: "65535" },
      { name: "Checksum", bits: 16, description: "校验和（伪头部 + TCP 头 + 数据）", color: "#00a05a", value: "0xabcd" },
      { name: "Urg Ptr", bits: 16, description: "紧急指针（URG 标志置位时有效）", color: "#00ff88", value: "0" },
      { name: "Options", bits: 32, description: "可选项（MSS, SACK, Timestamps 等）", color: "#00e07a", value: "MSS=1460" },
      { name: "Data", bits: 64, description: "应用层数据载荷", color: "#4a4a6a", value: "..." },
    ],
    codeExamples: [
      {
        title: "TCP 头部结构体定义",
        language: "c",
        description: "TCP 头部的 C 语言定义，注意位域的字节序问题——在小端系统上需要反转位域顺序。",
        code: `#include <stdint.h>

struct tcphdr {
    uint16_t source;    /* 源端口                    */
    uint16_t dest;      /* 目的端口                  */
    uint32_t seq;       /* 序列号                    */
    uint32_t ack_seq;   /* 确认号                    */
#if defined(__LITTLE_ENDIAN_BITFIELD)
    uint16_t res1:4,    /* 保留位                    */
             doff:4,    /* 数据偏移（头部长度）      */
             fin:1,     /* FIN: 发送端完成发送       */
             syn:1,     /* SYN: 同步序列号           */
             rst:1,     /* RST: 重置连接             */
             psh:1,     /* PSH: 立即推送数据         */
             ack:1,     /* ACK: 确认号有效           */
             urg:1,     /* URG: 紧急指针有效         */
             ece:1,     /* ECE: ECN 回显             */
             cwr:1;     /* CWR: 拥塞窗口减小         */
#elif defined(__BIG_ENDIAN_BITFIELD)
    uint16_t doff:4, res1:4,
             cwr:1, ece:1, urg:1, ack:1,
             psh:1, rst:1, syn:1, fin:1;
#endif
    uint16_t window;    /* 接收窗口大小              */
    uint16_t check;     /* 校验和                    */
    uint16_t urg_ptr;   /* 紧急指针                  */
} __attribute__((packed));`,
      },
      {
        title: "TCP 有限状态机实现",
        language: "c",
        description: "TCP 连接状态机是 TCP 实现的核心。每个 TCP 连接（PCB）维护当前状态，根据收到的报文和用户操作进行状态转移。",
        code: `/* TCP 连接状态枚举 (RFC 793) */
typedef enum {
    TCP_CLOSED      = 0,
    TCP_LISTEN      = 1,
    TCP_SYN_SENT    = 2,
    TCP_SYN_RCVD    = 3,
    TCP_ESTABLISHED = 4,
    TCP_FIN_WAIT_1  = 5,
    TCP_FIN_WAIT_2  = 6,
    TCP_CLOSE_WAIT  = 7,
    TCP_CLOSING     = 8,
    TCP_LAST_ACK    = 9,
    TCP_TIME_WAIT   = 10,
} tcp_state_t;

/* TCP 协议控制块 (PCB) */
struct tcp_pcb {
    tcp_state_t state;    /* 当前状态               */
    uint32_t    snd_una;  /* 已发送但未确认的最小序号 */
    uint32_t    snd_nxt;  /* 下一个要发送的序号      */
    uint32_t    snd_wnd;  /* 发送窗口大小            */
    uint32_t    rcv_nxt;  /* 期望收到的下一个序号    */
    uint32_t    rcv_wnd;  /* 接收窗口大小            */
    uint32_t    cwnd;     /* 拥塞窗口                */
    uint32_t    ssthresh; /* 慢启动阈值              */
    uint16_t    local_port;
    uint16_t    remote_port;
    uint32_t    local_ip;
    uint32_t    remote_ip;
};

/* 处理 ESTABLISHED 状态下的报文 */
void tcp_established(struct tcp_pcb *pcb,
                     struct tcphdr *th, size_t data_len) {
    /* 处理 ACK：更新发送窗口 */
    if (th->ack) {
        uint32_t ack = ntohl(th->ack_seq);
        if (ack > pcb->snd_una) {
            pcb->snd_una = ack;
            /* 拥塞控制：收到 ACK 增大 cwnd */
            if (pcb->cwnd < pcb->ssthresh)
                pcb->cwnd += 1460;  /* 慢启动：指数增长 */
            else
                pcb->cwnd += (1460 * 1460) / pcb->cwnd; /* 拥塞避免：线性增长 */
        }
    }
    /* 处理 FIN：进入 CLOSE_WAIT */
    if (th->fin) {
        pcb->rcv_nxt++;
        pcb->state = TCP_CLOSE_WAIT;
        tcp_send_ack(pcb);  /* 发送 ACK */
    }
    /* 处理数据 */
    if (data_len > 0) {
        /* 将数据写入接收缓冲区，更新 rcv_nxt */
        pcb->rcv_nxt += data_len;
        tcp_send_ack(pcb);
    }
}`,
      },
      {
        title: "TCP 三次握手服务端实现",
        language: "c",
        description: "服务端监听并响应三次握手的完整流程：LISTEN → SYN_RCVD → ESTABLISHED。",
        code: `#include <stdlib.h>
#include <time.h>

/* 生成安全的初始序列号 (ISN)
 * 现代实现使用加密哈希，这里简化为随机数 */
uint32_t generate_isn(void) {
    return (uint32_t)(rand() ^ time(NULL));
}

/* 发送 SYN+ACK（服务端响应客户端 SYN）*/
void tcp_send_synack(struct tcp_pcb *pcb,
                     uint32_t client_isn) {
    struct tcphdr th = {0};
    th.source  = htons(pcb->local_port);
    th.dest    = htons(pcb->remote_port);
    th.seq     = htonl(pcb->snd_nxt);     /* 服务端 ISN */
    th.ack_seq = htonl(client_isn + 1);   /* ACK = 客户端 ISN + 1 */
    th.doff    = 5;
    th.syn     = 1;
    th.ack     = 1;
    th.window  = htons(65535);
    th.check   = tcp_checksum(&th, pcb);

    pcb->state   = TCP_SYN_RCVD;
    pcb->snd_nxt++;  /* SYN 占用一个序号 */
    send_ip_packet(pcb->local_ip, pcb->remote_ip,
                   IPPROTO_TCP, &th, sizeof(th));
}

/* 处理 LISTEN 状态收到的 SYN */
void tcp_listen_handler(struct tcp_pcb *server,
                        struct tcphdr *th) {
    if (!th->syn) return;

    /* 创建新的 PCB 处理此连接 */
    struct tcp_pcb *pcb = calloc(1, sizeof(*pcb));
    pcb->state       = TCP_LISTEN;
    pcb->local_port  = server->local_port;
    pcb->remote_port = ntohs(th->source);
    pcb->rcv_nxt     = ntohl(th->seq) + 1;
    pcb->snd_nxt     = generate_isn();

    tcp_send_synack(pcb, ntohl(th->seq));
}`,
      },
      {
        title: "TCP 拥塞控制（Reno 算法）",
        language: "c",
        description: "TCP Reno 拥塞控制的核心逻辑：慢启动、拥塞避免、快速重传与快速恢复四个阶段。",
        code: `#define TCP_MSS 1460  /* 最大报文段大小 */

/* 拥塞控制状态 */
typedef enum {
    CC_SLOW_START,        /* 慢启动阶段     */
    CC_CONG_AVOIDANCE,    /* 拥塞避免阶段   */
    CC_FAST_RECOVERY,     /* 快速恢复阶段   */
} cc_state_t;

struct cc_ctx {
    uint32_t   cwnd;       /* 拥塞窗口（字节）*/
    uint32_t   ssthresh;   /* 慢启动阈值      */
    cc_state_t state;
    int        dup_acks;   /* 重复 ACK 计数   */
};

/* 收到新 ACK 时更新拥塞窗口 */
void cc_on_ack(struct cc_ctx *cc) {
    cc->dup_acks = 0;
    switch (cc->state) {
    case CC_SLOW_START:
        cc->cwnd += TCP_MSS;  /* 指数增长 */
        if (cc->cwnd >= cc->ssthresh)
            cc->state = CC_CONG_AVOIDANCE;
        break;
    case CC_CONG_AVOIDANCE:
        /* 每个 RTT 增加 1 个 MSS（线性增长）*/
        cc->cwnd += (TCP_MSS * TCP_MSS) / cc->cwnd;
        break;
    case CC_FAST_RECOVERY:
        cc->cwnd   = cc->ssthresh;
        cc->state  = CC_CONG_AVOIDANCE;
        break;
    }
}

/* 收到重复 ACK 时（可能丢包）*/
void cc_on_dup_ack(struct cc_ctx *cc) {
    cc->dup_acks++;
    if (cc->dup_acks == 3) {
        /* 3 个重复 ACK：触发快速重传 */
        cc->ssthresh = cc->cwnd / 2;
        cc->cwnd     = cc->ssthresh + 3 * TCP_MSS;
        cc->state    = CC_FAST_RECOVERY;
        /* 立即重传丢失的报文段 */
        tcp_retransmit();
    } else if (cc->state == CC_FAST_RECOVERY) {
        cc->cwnd += TCP_MSS;  /* 快速恢复中每收到重复 ACK 增大窗口 */
    }
}

/* 超时重传（最严重的拥塞信号）*/
void cc_on_timeout(struct cc_ctx *cc) {
    cc->ssthresh = cc->cwnd / 2;
    cc->cwnd     = TCP_MSS;  /* 重置为 1 个 MSS */
    cc->state    = CC_SLOW_START;
    cc->dup_acks = 0;
}`,
      },
    ],
    experiments: [
      {
        step: 1,
        title: "抓包观察三次握手",
        command: "# 终端 1：启动 TCP 服务端\nnc -l 8080\n\n# 终端 2：抓包\nsudo tcpdump -i lo -n -S tcp port 8080\n\n# 终端 3：发起连接\nnc 127.0.0.1 8080",
        description: "使用 netcat 建立 TCP 连接，同时用 tcpdump 捕获三次握手过程。-S 参数显示绝对序列号。",
        expectedOutput: "Flags [S], seq 1234567890\nFlags [S.], seq 9876543210, ack 1234567891\nFlags [.], ack 9876543211",
      },
      {
        step: 2,
        title: "观察 TCP 状态机变化",
        command: "# 在连接建立后、关闭前执行\nss -tna | grep 8080\n\n# 或使用 netstat\nnetstat -tna | grep 8080",
        description: "在连接的不同阶段查看 TCP 状态，观察 ESTABLISHED、FIN_WAIT、TIME_WAIT 等状态的变化。",
        expectedOutput: "ESTAB  0  0  127.0.0.1:8080  127.0.0.1:54321",
      },
      {
        step: 3,
        title: "抓包观察四次挥手",
        command: "# 在 netcat 连接中按 Ctrl+D 关闭连接\n# tcpdump 将捕获到四次挥手过程\nsudo tcpdump -i lo -n tcp port 8080 and 'tcp[tcpflags] & (tcp-fin|tcp-ack) != 0'",
        description: "观察 TCP 连接关闭时的四次挥手：FIN、ACK、FIN、ACK 的交互，以及 TIME_WAIT 状态。",
        expectedOutput: "Flags [F.], seq 100, ack 200\nFlags [.], ack 101\nFlags [F.], seq 200, ack 101\nFlags [.], ack 201",
      },
      {
        step: 4,
        title: "观察 TIME_WAIT 状态",
        command: "# 主动关闭连接后立即查看\nwatch -n 0.5 \"ss -tna | grep TIME-WAIT\"",
        description: "TIME_WAIT 状态持续 2MSL（约 60 秒），防止旧连接的延迟报文干扰新连接。观察其持续时间。",
        expectedOutput: "TIME-WAIT  0  0  127.0.0.1:8080  127.0.0.1:54321",
      },
      {
        step: 5,
        title: "使用 ss 查看拥塞窗口",
        command: "# 查看 TCP 连接的详细拥塞控制信息\nss -tin dst 8.8.8.8\n\n# 输出包含 cwnd、ssthresh、rtt 等信息\nss -tin | grep -A1 ESTAB",
        description: "ss 命令可以显示 TCP 连接的拥塞窗口（cwnd）、慢启动阈值（ssthresh）和 RTT 等拥塞控制参数。",
        expectedOutput: "cubic wscale:7,7 rto:204 rtt:1.2/0.4 ato:40 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 ssthresh:2147483647 bytes_sent:1234",
      },
    ],
    rfcs: [
      { number: "RFC 793", title: "Transmission Control Protocol (TCP)", url: "https://tools.ietf.org/html/rfc793" },
      { number: "RFC 5681", title: "TCP Congestion Control", url: "https://tools.ietf.org/html/rfc5681" },
      { number: "RFC 7414", title: "A Roadmap for TCP Specification Documents", url: "https://tools.ietf.org/html/rfc7414" },
    ],
  },
  {
    id: "application",
    name: "应用层",
    subtitle: "HTTP & DNS & TLS",
    color: "#f0e68c",
    glowColor: "rgba(240, 230, 140, 0.4)",
    icon: "🚀",
    level: 4,
    protocols: ["HTTP/1.1", "HTTP/2", "DNS", "TLS 1.3", "SSH"],
    overview:
      "应用层是用户直接交互的层次，定义了各种网络应用的通信协议。HTTP 是 Web 的基础，DNS 将域名解析为 IP 地址，TLS 在 TCP 之上提供加密传输。理解应用层协议有助于优化网络性能、排查应用故障，以及设计高效的网络服务。",
    keyPoints: [
      "HTTP/1.1 基于文本，使用持久连接（Keep-Alive）和管道化；HTTP/2 基于二进制帧，支持多路复用",
      "DNS 查询使用 UDP（53 端口），响应超过 512 字节时切换到 TCP；DNSSEC 提供安全验证",
      "TLS 握手在 TCP 握手完成后进行，协商加密算法、交换证书、建立会话密钥",
      "Socket 编程是应用层与传输层的接口，`socket()`, `bind()`, `listen()`, `accept()`, `connect()` 是核心系统调用",
      "HTTP 状态码：2xx 成功，3xx 重定向，4xx 客户端错误，5xx 服务端错误",
    ],
    packetFields: [
      { name: "Method", bits: 32, description: "HTTP 方法：GET POST PUT DELETE PATCH", color: "#f0e68c", value: "GET" },
      { name: "URL", bits: 64, description: "请求路径和查询参数", color: "#d4c870", value: "/api/data?id=1" },
      { name: "Version", bits: 24, description: "HTTP 版本号", color: "#b8aa54", value: "HTTP/1.1" },
      { name: "Headers", bits: 128, description: "请求头（Host, Content-Type, Authorization 等）", color: "#f0e68c", value: "Host: example.com" },
      { name: "Body", bits: 64, description: "请求体（POST/PUT 时携带数据）", color: "#4a4a6a", value: '{"key":"val"}' },
    ],
    codeExamples: [
      {
        title: "TCP Socket 服务端（C 语言）",
        language: "c",
        description: "使用 POSIX Socket API 实现一个最简单的 TCP Echo 服务器，展示 socket → bind → listen → accept → recv/send 的完整流程。",
        code: `#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT    8080
#define BACKLOG 10
#define BUFSIZE 4096

int main(void) {
    int server_fd, client_fd;
    struct sockaddr_in addr = {0};
    char buf[BUFSIZE];
    ssize_t n;

    /* 1. 创建 TCP Socket */
    server_fd = socket(AF_INET, SOCK_STREAM, 0);

    /* 允许端口复用（避免 TIME_WAIT 导致 bind 失败）*/
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* 2. 绑定地址和端口 */
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;  /* 监听所有网卡 */
    addr.sin_port        = htons(PORT);
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));

    /* 3. 开始监听，backlog=10 表示等待队列最大长度 */
    listen(server_fd, BACKLOG);
    printf("Listening on port %d...\\n", PORT);

    /* 4. 接受连接（阻塞直到有客户端连接）*/
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);
    client_fd = accept(server_fd,
                       (struct sockaddr *)&client_addr,
                       &client_len);
    printf("Connected: %s:%d\\n",
           inet_ntoa(client_addr.sin_addr),
           ntohs(client_addr.sin_port));

    /* 5. Echo 循环：收到什么就回什么 */
    while ((n = recv(client_fd, buf, BUFSIZE, 0)) > 0) {
        send(client_fd, buf, n, 0);
    }

    close(client_fd);
    close(server_fd);
    return 0;
}`,
      },
      {
        title: "TCP Socket 客户端（C 语言）",
        language: "c",
        description: "TCP 客户端实现，展示 socket → connect → send/recv 的流程，以及如何处理非阻塞 I/O。",
        code: `#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    int fd;
    struct sockaddr_in server = {0};
    char msg[] = "Hello, TCP!\\n";
    char buf[1024];
    ssize_t n;

    /* 1. 创建 TCP Socket */
    fd = socket(AF_INET, SOCK_STREAM, 0);

    /* 2. 设置服务器地址 */
    server.sin_family = AF_INET;
    server.sin_port   = htons(8080);
    inet_pton(AF_INET, "127.0.0.1", &server.sin_addr);

    /* 3. 发起三次握手连接 */
    if (connect(fd, (struct sockaddr *)&server,
                sizeof(server)) < 0) {
        perror("connect failed");
        return 1;
    }
    printf("Connected to server!\\n");

    /* 4. 发送数据 */
    send(fd, msg, strlen(msg), 0);

    /* 5. 接收 Echo 回复 */
    n = recv(fd, buf, sizeof(buf) - 1, 0);
    if (n > 0) {
        buf[n] = '\\0';
        printf("Echo: %s", buf);
    }

    /* 6. 关闭连接（发送 FIN）*/
    close(fd);
    return 0;
}`,
      },
      {
        title: "DNS 查询（使用 getaddrinfo）",
        language: "c",
        description: "使用 POSIX getaddrinfo() 进行 DNS 解析，这是现代 C 程序推荐的域名解析方式，支持 IPv4 和 IPv6。",
        code: `#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>

/* 解析域名并打印所有 IP 地址 */
void resolve_hostname(const char *hostname) {
    struct addrinfo hints = {0}, *res, *p;
    char ip_str[INET6_ADDRSTRLEN];

    hints.ai_family   = AF_UNSPEC;    /* IPv4 和 IPv6 都接受 */
    hints.ai_socktype = SOCK_STREAM;  /* TCP */

    int status = getaddrinfo(hostname, NULL, &hints, &res);
    if (status != 0) {
        fprintf(stderr, "getaddrinfo: %s\\n",
                gai_strerror(status));
        return;
    }

    printf("DNS resolution for %s:\\n", hostname);
    for (p = res; p != NULL; p = p->ai_next) {
        void *addr;
        const char *ipver;

        if (p->ai_family == AF_INET) {
            struct sockaddr_in *ipv4 =
                (struct sockaddr_in *)p->ai_addr;
            addr  = &(ipv4->sin_addr);
            ipver = "IPv4";
        } else {
            struct sockaddr_in6 *ipv6 =
                (struct sockaddr_in6 *)p->ai_addr;
            addr  = &(ipv6->sin6_addr);
            ipver = "IPv6";
        }

        inet_ntop(p->ai_family, addr,
                  ip_str, sizeof(ip_str));
        printf("  %s: %s\\n", ipver, ip_str);
    }

    freeaddrinfo(res);
}

int main(void) {
    resolve_hostname("www.google.com");
    resolve_hostname("github.com");
    return 0;
}`,
      },
    ],
    experiments: [
      {
        step: 1,
        title: "编译并运行 TCP Echo 服务器",
        command: "gcc -o echo_server echo_server.c\n./echo_server\n\n# 另一个终端连接\nnc 127.0.0.1 8080",
        description: "编译并运行 TCP Echo 服务器，使用 netcat 连接并发送消息，验证 Echo 功能。",
        expectedOutput: "Listening on port 8080...\nConnected: 127.0.0.1:54321",
      },
      {
        step: 2,
        title: "抓包分析 HTTP 请求",
        command: "# 抓取 HTTP 流量（明文）\nsudo tcpdump -i any -n -A 'tcp port 80 and (tcp[tcpflags] & tcp-push != 0)'\n\n# 发送 HTTP 请求\ncurl -v http://httpbin.org/get",
        description: "使用 tcpdump 的 -A 参数以 ASCII 格式显示数据包内容，观察 HTTP 请求和响应的明文内容。",
        expectedOutput: "GET /get HTTP/1.1\\r\\nHost: httpbin.org\\r\\n...",
      },
      {
        step: 3,
        title: "DNS 查询抓包分析",
        command: "# 抓取 DNS 查询\nsudo tcpdump -i any -n udp port 53\n\n# 另一个终端发起 DNS 查询\ndig www.google.com\nnslookup github.com",
        description: "抓取 DNS 查询包，观察 UDP 53 端口上的查询（Query）和响应（Response）报文结构。",
        expectedOutput: "IP 192.168.1.100.54321 > 8.8.8.8.53: A? www.google.com\nIP 8.8.8.8.53 > 192.168.1.100.54321: A 142.250.x.x",
      },
      {
        step: 4,
        title: "TLS 握手分析",
        command: "# 使用 openssl 查看 TLS 握手详情\nopenssl s_client -connect github.com:443 -showcerts\n\n# 或用 curl 显示 TLS 信息\ncurl -v --tlsv1.3 https://github.com 2>&1 | grep -E 'TLS|SSL|Cipher'",
        description: "观察 TLS 握手过程：ClientHello → ServerHello → Certificate → Finished，了解密钥协商机制。",
        expectedOutput: "TLSv1.3, TLS handshake, Client hello\nTLSv1.3, TLS handshake, Server hello\nSSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384",
      },
      {
        step: 5,
        title: "使用 Wireshark 可视化分析",
        command: "# 捕获并保存到文件\nsudo tcpdump -i any -w capture.pcap\n\n# 用 tshark（命令行 Wireshark）分析\ntshark -r capture.pcap -Y 'http' -T fields -e http.request.method -e http.request.uri",
        description: "将抓包数据保存为 pcap 文件，使用 Wireshark 或 tshark 进行可视化分析，过滤特定协议的字段。",
        expectedOutput: "GET  /api/data\nPOST /api/submit",
      },
    ],
    rfcs: [
      { number: "RFC 9110", title: "HTTP Semantics", url: "https://tools.ietf.org/html/rfc9110" },
      { number: "RFC 1035", title: "Domain Names - Implementation and Specification", url: "https://tools.ietf.org/html/rfc1035" },
      { number: "RFC 8446", title: "The Transport Layer Security (TLS) Protocol Version 1.3", url: "https://tools.ietf.org/html/rfc8446" },
    ],
  },
];

export const layerColors: Record<string, string> = {
  link: "#ff6b6b",
  network: "#00d4ff",
  transport: "#00ff88",
  application: "#f0e68c",
};
