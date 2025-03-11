import React from 'react';

const Component = () => {
    return (
        <div className={styles.header}>
            <div className={styles.headerTitle}>
                <img src={logo} style={{width: '125px', marginRight: 20}} />
                <img src={rebateCenter} style={{width: '125px'}}  />
            </div>
            <div className={styles.rightContent}>
                <ul>
                    <li className={styles.item}>
                        <a href='/auth/login'>{i18n.land_erp_sys}</a>
                    </li>
                    <li className={styles.item}>
                        <a href='/auth/goto_qt' target="_self">{i18n.common_datacaciques_qt_name}</a>
                    </li>
                    <li className={styles.item}>
                        <a href='/auth/goto_qt?url=/explore/product' target="_self">{i18n.payment_big_data_explore}</a>
                    </li>
                    <li className={styles.item}>
                        <UserInfo />
                    </li>
                </ul>
            </div>
        </div>
    )
};

export default Component;

