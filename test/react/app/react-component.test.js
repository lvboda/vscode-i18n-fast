import React from 'react';

const Component = (props) => {
    const { name = '标题' } = props;

    return (
        <div>
            <div>{name}</div>
            <FormattedMessage id="app.ads.report.ads" />
            <div>{formatMessage({ id: 'app.ads.hour-report-data-des-tooltip' })}</div>
            <div>{formatMessage({ id: 'app.test.testing' })}</div>
        </div>
    )
}

export default Component;